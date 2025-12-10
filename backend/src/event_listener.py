from typing import Any
from agents import Agent, AgentHooks, RunContextWrapper, TResponseInputItem, Tool

class EventListener(AgentHooks):

    async def on_handoff(self, context: RunContextWrapper[Any], agent: Agent[Any], source: Agent[Any]):
        print(f"[EVENT]: OnHandoff '{source.name}' -> '{agent.name}'")
        


    async def on_start(self, context: RunContextWrapper[Any], agent: Agent[Any]):
        print(f"[EVENT]: OnStart '{agent.name}', context: {str(context.context)}")


    async def on_end(self, context: RunContextWrapper[Any], agent: Agent[Any], output: Any):
        print(f"[EVENT]: OnEnd '{agent.name}', context: {str(context.context)}, output: {str(output)}")

    async def on_tool_start(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
    ) -> None:
        print(f"[EVENT]: OnToolStart '{agent.name}', tool: '{tool.name}'")


    async def on_tool_end(
        self,
        context: RunContextWrapper[Any],
        agent: Agent[Any],
        tool: Tool,
        result: str,
    ) -> None:
        print(f"[EVENT]: OnToolEnd '{agent.name}', tool: '{tool.name}', result: {str(result)}")
