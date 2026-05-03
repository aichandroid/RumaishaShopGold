export interface Purchase {
  id: string;
  date: string;
  serialNumber: string;
  price: number;
  sellerName: string;
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

export type AppMode = 'purchase' | 'sale' | 'recap' | 'prices' | 'settings';
