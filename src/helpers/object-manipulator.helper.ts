export class ObjectManipulator {
  /**
   * Safely delete a key from an object
   * @param obj The object to be manipulated
   * @param key The key to be deleted
   * @returns void
   */
  static safeDelete<T extends object, K extends keyof T>(obj: T, key: K): void {
    if (!(key in obj)) {
      console.warn(`Property ${String(key)} does not exist on the object.`);
      return;
    }

    delete obj[key];
  }

  /**
   * Remove specified keys from an object
   * @param obj The object to be manipulated
   * @param keys The keys to be removed
   * @returns void
   */
  static removeKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): void {
    if (!keys.length) {
      console.warn('No keys to be removed from the object.');
      return;
    }

    keys.forEach((key) => ObjectManipulator.safeDelete(obj, key));
  }

  /**
   * Exclude specified keys from an object
   * @param obj The object to be manipulated
   * @param keys The keys to be deleted
   * @returns The object without the specified keys
   */
  static exclude<T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> {
    return Object.keys(obj).reduce((acc, key) => {
      if (!keys.includes(key as K)) {
        acc[key] = obj[key];
      }

      return acc;
    }, {} as Partial<T>);
  }
}
