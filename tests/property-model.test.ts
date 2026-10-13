import { describe, expect, it, vi } from "vitest";
import { Mesh, InstancedMesh } from "three";
import { buildPropertyModel } from "../src/lib/propertyModel";
import { aerialPoint, propertyLayout } from "../src/lib/propertyLayout";

describe("Native property reconstruction", () => {
  it("traces relative landmarks from one aerial coordinate system", () => {
    expect(propertyLayout.residence).toEqual(aerialPoint(146, 190));
    expect(propertyLayout.garage).toEqual(aerialPoint(132, 221));
    expect(propertyLayout.drive[1]).toEqual(propertyLayout.entrance);
    expect(propertyLayout.drive[0][0]).toBeGreaterThanOrEqual(66 - 3.5 / 2);
    expect(propertyLayout.drive[0][0]).toBeLessThanOrEqual(66 + 3.5 / 2);
    // Garage is nearby and south of the residence, not displaced far west.
    expect(propertyLayout.garage[1] - propertyLayout.residence[1]).toBeCloseTo(
      31 * 0.36,
    );
    expect(propertyLayout.garage[0] - propertyLayout.residence[0]).toBeCloseTo(
      -14 * 0.36,
    );
    expect(propertyLayout.pond).toHaveLength(15);
  });
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
      expect([house.position.x, house.position.z]).toEqual(
        propertyLayout.residence,
      );
      expect([garage.position.x, garage.position.z]).toEqual(
        propertyLayout.garage,
      );
      const pond = model.getObjectByName("Pond water")!;
      expect([pond.position.x, pond.position.z]).toEqual(
        propertyLayout.pondCenter,
      );
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
