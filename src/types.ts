export interface Purchase {
  id: string;
  date: string;
  serialNumber: string;
  year: number;
  weight: number;
  price: number;
  sellerName: string;
}

export interface ManualStock {
  id: string;
  dateAdded: string;
  serialNumber: string;
  weight: number;
  year: number;
  costPrice?: number;
}

export interface Sale {
  id: string;
  date: string;
  weight: number;
  serialNumber: string;
  buyerName: string;
  sellingPrice: number;
  restockPrice: number;
  profit: number;
}

export interface GoldPrice {
  id: string;
  gram: number;
  price: number;
  type: 'Antam' | 'UBS' | 'Galeri24' | 'Perak Nadir';
}

export type AppMode = 'purchase' | 'sale' | 'stock' | 'recap' | 'prices' | 'settings';
