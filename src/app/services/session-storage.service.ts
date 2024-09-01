import { Injectable } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class SessionStorageService {
  getValue<T>(key: string): T | null {
    const item = sessionStorage.getItem(key);
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
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  clearValue(key: string): void {
    sessionStorage.removeItem(key);
  }

  clearAll(): void {
    sessionStorage.clear();
  }
}
