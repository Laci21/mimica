from pydantic.types import Json
from agents import Agent, RunConfig, Runner

from src.data_models import Persona
from src.utils import llm_gpt_4o

class KnowledgeGenerator:
    def __init__(self, persona: Persona, browser_events: list[Json]):
        self.knowledge = []
        self.persona = persona
        self.browser_events = browser_events
        self.generation_prompt_template = "Take the following browser events and generate a list of knowledge statements that are universal to the user experience. Use the persona's goals, preferences, and pain points to generate the knowledge statements. Return a JSON array of knowledge statements."

    def _build_prompt(self) -> str:
        prompt = (
                    f"Persona: {self.persona.display_name}\n"
                    f"Description: {self.persona.description}\n"
                    f"Goals: {self.persona.llm_prompt.get('behavioralRules', [])}\n"
                    f"Pain Points: {self.persona.behavior}\n\n"
                    f"Browser Events:\n{self.browser_events}\n\n"
                    "Generate universal UX knowledge statements based on these events and the persona's characteristics."
                )
        return prompt

    async def call_llm(self) -> str:
        agent = Agent(
            name="knowledge_generator",
            instructions=self.generation_prompt_template,
            model=llm_gpt_4o,
        )
        
        prompt = self._build_prompt()
        
        result = await Runner.run(
            agent,
            input=prompt,
            run_config=RunConfig(tracing_disabled=True)
        )
        
        return result.final_output

    async def generate_knowledge(self) -> str:
        llm_response = await self.call_llm()
        self.knowledge = llm_response
        return self.knowledge

