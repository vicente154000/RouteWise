import { Venue } from "@/core/domain/venue";
import { nearestNeighbor, twoOpt, TSPConfig, DEFAULT_TSP_CONFIG } from "@/core/domain/tsp";

export class RouteOptimizationService {
  private config: TSPConfig;

  constructor(config?: TSPConfig) {
    this.config = config || DEFAULT_TSP_CONFIG;
  }

  /**
   * Envuelve y ejecuta los algoritmos TSP combinados aplicando las reglas de negocio
   */
  public optimize(stops: Venue[]): Venue[] {
    if (stops.length < 2) return [...stops];
    
    // Ejecuta Nearest Neighbor con pesos promocionales B2B como aproximación inicial
    const initialRoute = nearestNeighbor(stops, this.config);
    
    // Aplica 2-Opt para optimizar cruces de trayectoria y distancias residuales
    return twoOpt(initialRoute, this.config);
  }
}