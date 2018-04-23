export class Randomizer {
  private static _initialized: boolean = false;
  private static _mod: number = 0.0;
  private static _mul: number = 0.0;
  private static _seed: number = 0.0;

  static get_initialized(): boolean {
    return Randomizer._initialized;
  }

  static get_mod(): number {
    return Randomizer._mod;
  }

  static get_mul(): number {
    return Randomizer._mul;
  }

  static get_seed(): number {
    return Randomizer._seed;
  }

  static set_initialized(): void {
    Randomizer._initialized = true;
  }

  static set_mod(randMod: number): number {
    Randomizer._mod = randMod;
    return Randomizer._mod;
  }

  static set_mul(randMul: number): number {
    Randomizer._mul = randMul;
    return Randomizer._mul;
  }

  static set_seed(randSeed: number): number {
    Randomizer._seed = randSeed;
    return Randomizer._seed;
  }
}
