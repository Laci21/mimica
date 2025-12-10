import json
from typing import List
from pydantic.types import Json
from agents import Agent, RunConfig, Runner

from src.data_models import Persona
from src.utils import llm_gpt_4o

class KnowledgeGenerator:
    def __init__(self, persona: Persona, browser_events: list[Json]):
        self.knowledge = []
        self.persona = persona
        self.browser_events = browser_events
        self.generation_prompt_template = "Take the following browser events and generate a list of knowledge statements that are universal to the user experience. Use the persona's goals, preferences, and pain points to generate the knowledge statements. For each knowledge statement, include a 'reasoning' field explaining why this insight is valid and why it belongs in a trusted knowledge fabric. Return a JSON array of objects with 'statement' and 'reasoning' fields."

    def _build_prompt(self) -> str:
        prompt = (
                    f"Persona: {self.persona.display_name}\n"
                    f"Description: {self.persona.description}\n"
                    f"Goals: {self.persona.llm_prompt.get('behavioralRules', [])}\n"
                    f"Pain Points: {self.persona.behavior}\n\n"
                    f"Browser Events:\n{self.browser_events}\n\n"
                    f"Generate universal UX knowledge statements. Explicitly reference persona '{self.persona.display_name}' (ID: {self.persona.id}) in each statement or reasoning, as this knowledge will be stored in a data lake alongside knowledge from other personas. Each statement must include reasoning explaining why it's valid and why it should be stored in a trusted knowledge fabric."
                )
        return prompt

    async def call_llm(self, name: str, instructions: str, prompt: str) -> str:
        agent = Agent(
            name=name,
            instructions=instructions,
            model=llm_gpt_4o,
        )
        
        
        
        result = await Runner.run(
            agent,
            input=prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        return result.final_output

    async def _generate_knowledge(self) -> str:
        prompt = self._build_prompt()
        llm_response = await self.call_llm("knowledge_generator", self.generation_prompt_template, prompt)
        return llm_response

    async def _is_valid_knowledge_item(self, knowledge_item: str) -> bool:    
        validation_instructions = "You are a UX knowledge validator. Return only 'true' or 'false' as JSON boolean."
        validation_prompt = (
            f"Validate this knowledge piece for persona '{self.persona.display_name}' (ID: {self.persona.id}).\n\n"
            "Context: This knowledge will be stored in a Trusted Knowledge Fabric - a shared context that agents use "
            "to maintain shared understanding. Knowledge is extracted from UI manipulation runs by user personas "
            "to learn for future iterations. The fabric should contain high-level truths that are general and reusable, "
            "not specific to a particular UI or element.\n\n"
            "Validation criteria:\n"
            "1. Is it universal (not specific to this UI/element/page)?\n"
            "2. Is it a high-level, general truth that can be reused across different contexts?\n"
            "3. Is it actionable and suitable for informing future UI design decisions?\n\n"
            "4. Is it something that would be valuable long term professional knowledge for a UX designer / UI engineer, not something short term only valid for a specific UI?\n"
            f"Knowledge to validate:\n{knowledge_item}\n\n"
            "Return JSON boolean: true if valid, false otherwise."
        )
        
        response = await self.call_llm("knowledge_validator", validation_instructions, validation_prompt)
        return "true" in response.lower()

    async def _validate_knowledge(self, knowledge: list[str]) -> list[str]:
        validated_knowledge = []
        for i, knowledge_item in enumerate(knowledge, 1):
            try:
                item_data = json.loads(knowledge_item)
                item_statement = item_data.get('statement', 'N/A')[:80] + '...' if len(item_data.get('statement', '')) > 80 else item_data.get('statement', 'N/A')
            except:
                item_statement = knowledge_item[:80] + '...' if len(knowledge_item) > 80 else knowledge_item
            
            print(f"  Validating item {i}/{len(knowledge)}: {item_statement}")
            is_valid = await self._is_valid_knowledge_item(knowledge_item)
            
            if is_valid:
                print(f"    ✓ VALID - keeping")
                validated_knowledge.append(knowledge_item)
            else:
                print(f"    ✗ INVALID - dropping")
        
        return validated_knowledge
        
    async def generate_knowledge(self) -> list[str]:
        llm_response = await self._generate_knowledge()
        response_text = llm_response.strip()
        
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            if json_end > json_start:
                response_text = response_text[json_start:json_end].strip()
        
        knowledge_data = json.loads(response_text)
        knowledge_list = [json.dumps(item) for item in knowledge_data]
        self.validated_knowledge_list = await self._validate_knowledge(knowledge_list)
        return self.validated_knowledge_list

