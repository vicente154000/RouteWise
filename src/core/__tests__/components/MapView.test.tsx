import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

// Mock Map library to avoid heavy map rendering
vi.mock("react-map-gl/maplibre", () => {
  const React = require("react");
  function MockMap(props: any) {
    return React.createElement(
      "div",
      {
        "data-testid": "mock-map",
        onClick: (e: any) =>
          props.onClick &&
          props.onClick({ lngLat: { lng: -3.7, lat: 40.4 }, originalEvent: e }),
      },
      props.children,
    );
  }
  function Marker(props: any) {
    return React.createElement(
      "div",
      { "data-testid": "mock-marker", onClick: props.onClick },
      props.children,
    );
  }
  function Popup(props: any) {
    return React.createElement(
      "div",
      { "data-testid": "mock-popup" },
      props.children,
    );
  }
  return { default: MockMap, Marker, Popup };
});

vi.mock("@/core/infrastructure/geocoding", () => ({
  reverseGeocode: vi.fn().mockResolvedValue("Mock Address"),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));

import MapView from "@/components/MapView";
import type { Venue } from "@/core/domain/venue";

describe("MapView component (unit)", () => {
  it("renderiza mapa y permite añadir parada al hacer click", async () => {
    const onAddStop = vi.fn();
    render(
      <MapView
        stops={[]}
        optimizedRoute={[]}
        routeGeometry={[]}
        onAddStop={onAddStop}
      />,
    );

    const map = screen.getByTestId("mock-map");
    fireEvent.click(map);

    // wait for the async reverseGeocode
    await Promise.resolve();

    expect(onAddStop).toHaveBeenCalled();
  });
});
