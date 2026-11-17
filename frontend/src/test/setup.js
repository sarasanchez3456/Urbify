// Con Vitest sin variables globales, Testing Library no limpia solo el DOM entre pruebas: se hace aquí.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
