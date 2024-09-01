import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class LocalStorageService {
  getValue<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item);
    } catch (e) {
      return null;
    }
  }

  setValue<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  clearValue(key: string): void {
    localStorage.removeItem(key);
  }

  clearAll(): void {
    localStorage.clear();
  }
}
