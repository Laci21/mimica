from abc import abstractmethod
from pathlib import Path

from src.data_models import Persona


class PersonaRepository:

    @abstractmethod
    def get_all(self) -> list[Persona]:
        return []

    @abstractmethod
    def get_by_id(self, id: str) -> Persona | None:
        return


class PersonaFileRepository(PersonaRepository):
    def __init__(self, path: str):
        # Preload all personas from the given directory
        self.personas = self._load_all_personas(path)
        print(f"Loaded {len(self.personas)} personas: {", ".join([persona.id for persona in self.personas])}")

    def get_all(self) -> list[Persona]:
        return self.personas

    def get_by_id(self, id: str) -> Persona | None:
        for persona in self.get_all():
            if persona.id == id:
                return persona
        return None

    def _load_all_personas(self, path: str) -> list[Persona]:
        personas: list[Persona] = []
        base_path = Path(path)
        for file_path in base_path.glob("*.json"):
            persona = self._load_persona(str(file_path))
            if persona is not None:
                personas.append(persona)
        return personas

    def _load_persona(self, file_path: str) -> Persona | None:
        with open(file_path, 'r') as file:
            return Persona.model_validate_json(file.read())


repository = PersonaFileRepository(path="data/personas")