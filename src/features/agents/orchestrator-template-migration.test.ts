import { describe, expect, it } from "vitest"
import type { SquadTemplate } from "./orchestrator-types"
import { parseLegacyTemplates } from "./orchestrator-template-migration"

const validTemplate: SquadTemplate = {
  id: "custom-squad-1",
  name: "Local squad",
  description: "Stored on this device",
  builtIn: false,
  steps: [
    {
      order: 0,
      agentRole: "backend",
      cliTool: "opencode",
      title: "Implement locally",
      prompt: "Implement the requested change.",
    },
  ],
}

describe("legacy orchestrator template migration", () => {
  it("keeps valid custom templates and skips malformed entries", () => {
    const raw = JSON.stringify([
      validTemplate,
      {
        id: "broken",
        name: "Broken",
        description: "Unsupported CLI",
        steps: [
          {
            order: 0,
            agentRole: "backend",
            cliTool: "remote-api",
            title: "Invalid",
            prompt: "Invalid",
          },
        ],
      },
    ])

    expect(parseLegacyTemplates(raw, new Set())).toEqual([validTemplate])
  })

  it("ignores templates already stored in SQLite", () => {
    expect(
      parseLegacyTemplates(
        JSON.stringify([validTemplate]),
        new Set([validTemplate.id])
      )
    ).toEqual([])
  })

  it("never imports a template using a built-in ID", () => {
    expect(
      parseLegacyTemplates(
        JSON.stringify([{ ...validTemplate, id: "dev" }]),
        new Set()
      )
    ).toEqual([])
  })

  it("returns an empty list for malformed JSON", () => {
    expect(parseLegacyTemplates("not-json", new Set())).toEqual([])
  })
})
