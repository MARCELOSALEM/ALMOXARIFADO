
export enum MovementType {
  IN = 'ENTRADA',
  OUT = 'SAÍDA'
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minLevel: number;
  lastUpdated: string;
}

export interface Movement {
  id: string;
  itemId: string;
  itemName: string;
  type: MovementType;
  quantity: number;
  destination: string;
  date: string;
  user: string;
}

export type ViewState = 'dashboard' | 'inventory' | 'movements' | 'reports';
