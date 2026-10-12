import { describe, expect, it, vi } from "vitest";
import { Mesh, InstancedMesh } from "three";
import { buildPropertyModel } from "../src/lib/propertyModel";

describe("Native property reconstruction", () => {
  it("builds the photo-informed features as geometry, not photographic billboards", () => {
    const context = {
      fillStyle: "",
      fillRect() {},
      createRadialGradient: () => ({ addColorStop() {} }),
    };
    vi.stubGlobal("document", {
      createElement: () => ({ width: 0, height: 0, getContext: () => context }),
    });
    try {
      const model = buildPropertyModel();
      expect(model.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
      const house = model.getObjectByName("Residence")!,
        garage = model.getObjectByName("Two-door garage")!;
      expect(house.position.x).toBeLessThan(0);
      expect(house.position.z).toBeGreaterThan(0);
      expect(garage.position.x).toBeLessThan(house.position.x);
      expect(
        house.children.filter((c) => c.name === "Dormer body"),
      ).toHaveLength(2);
      expect(house.getObjectByName("White chimney")).toBeInstanceOf(Mesh);
      expect(house.getObjectByName("Porch white column")).toBeInstanceOf(Mesh);
      expect(
        garage.children.filter((c) => c.name === "Garage door"),
      ).toHaveLength(2);
      for (const name of [
        "Pond water",
        "Natural pond bank",
        "Curving gravel drive",
        "Entrance stone pier",
      ])
        expect(model.getObjectByName(name)).toBeInstanceOf(Mesh);
      expect(
        model.children.filter((c) => c instanceof InstancedMesh).length,
      ).toBeGreaterThanOrEqual(5);
      const types: string[] = [];
      model.traverse((c) => types.push(c.type));
      expect(types).not.toContain("Sprite");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
