declare module "@3d-dice/dice-box-threejs" {
  export interface DieRoll {
    /** The type of the die (e.g., "d20", "d6") */
    type: string;
    /** The number of sides on the die */
    sides: number;
    /** The unique identifier for this specific die instance */
    id: number;
    /** The numeric value rolled */
    value: number;
    /** The label displayed on the face (e.g., "1", "20", or a texture path) */
    label: string | number;
    /** The reason for the result (e.g., "natural", "forced", "reroll") */
    reason: string;
  }

  export interface DiceSet {
    /** The number of dice in this set */
    num: number;
    /** The type of dice in this set (e.g., "d20") */
    type: string;
    /** The number of sides */
    sides: number;
    /** The individual roll results for the dice in this set */
    rolls: DieRoll[];
    /** The sum of the values in this set */
    total: number;
  }

  export interface RollResult {
    /** The notation string used for the roll (e.g., "2d20+1d6") */
    notation: string;
    /** The results grouped by dice set */
    sets: DiceSet[];
    /** The constant modifier added to the total (e.g., the "+5" in "1d20+5") */
    modifier: number;
    /** The grand total of the roll including modifiers */
    total: number;
  }

  export interface ColorSet {
    name: string;
    foreground: string | string[];
    background: string | string[];
    outline: string | string[];
    /** Name of the texture to apply or array of texture names */
    texture: string | string[];
    description?: string;
    category?: string;
    edge?: string | string[];
    material?: "plastic" | "metal" | "glass" | "wood" | "none";
  }

  export interface DiceBoxOptions {
    /** Path to the folder containing assets (textures/sounds) */
    assetPath?: string;
    /** Target framerate (default: 1/60) */
    framerate?: number;
    /** Enable sound effects (default: false) */
    sounds?: boolean;
    /** Sound volume percentage (0-100, default: 100) */
    volume?: number;
    /** Hex color for the spotlight (default: 0xefdfd5) */
    color_spotlight?: number;
    /** Enable shadows (default: true) */
    shadows?: boolean;
    /** * The surface texture/material of the table
     * Options: 'green-felt', 'blue-felt', 'red-felt', 'wood_table', 'wood_tray', 'metal', 'default'
     */
    theme_surface?: string;
    /** * Material behavior for sound calculations
     * Options: 'plastic', 'wood', 'metal', 'coin'
     */
    sound_dieMaterial?: string;
    /** Custom color set definition */
    theme_customColorset?: ColorSet | null;
    /** * Predefined color set name
     * Options include: 'white', 'black', 'red', 'blue', 'green', etc.
     */
    theme_colorset?: string;
    /** Texture name to apply to dice */
    theme_texture?: string;
    /** * Material visual properties
     * Options: 'plastic', 'metal', 'glass', 'wood', 'none'
     */
    theme_material?: string;
    /** Multiplier for gravity force (default: 400) */
    gravity_multiplier?: number;
    /** Intensity of the lights (default: 0.7) */
    light_intensity?: number;
    /** Base scaling factor for dice (default: 100) */
    baseScale?: number;
    /** Throw strength multiplier (default: 1) */
    strength?: number;
    /** Physics iteration limit (default: 1000) */
    iterationLimit?: number;
    /** Callback fired when a roll is complete */
    onRollComplete?: (result: RollResult) => void;
    /** Callback fired when a reroll is complete */
    onRerollComplete?: (result: DieRoll[]) => void;
    /** Callback fired when dice are added */
    onAddDiceComplete?: (result: DieRoll[]) => void;
    /** Callback fired when dice are removed */
    onRemoveDiceComplete?: (result: DieRoll[]) => void;
  }

  export default class DiceBox {
    /**
     * @param selector CSS selector for the container element (e.g. "#dice-box")
     * @param options Configuration options
     */
    constructor(selector: string, options?: DiceBoxOptions);

    /**
     * Initialize the 3D scene, physics world, and assets.
     * Must be called before rolling.
     */
    initialize(): Promise<void>;

    /**
     * Updates the configuration options dynamically.
     * Triggers asset reloading if theme properties are changed.
     */
    updateConfig(options: Partial<DiceBoxOptions>): Promise<void>;

    /**
     * Roll dice based on a notation string.
     * @param notation Standard dice notation (e.g., "4d6", "1d20+5")
     */
    roll(notation: string): Promise<RollResult>;

    /**
     * Reroll specific dice by their IDs.
     * @param diceIds Array of dice IDs (indices) to reroll
     */
    reroll(diceIds: number[]): Promise<DieRoll[]>;

    /**
     * Add new dice to the existing scene based on notation.
     * @param notation Standard dice notation (e.g., "2d6")
     */
    add(notation: string): Promise<DieRoll[]>;

    /**
     * Remove specific dice from the scene.
     * @param diceIds Array of dice IDs (indices) to remove
     */
    remove(diceIds: number[]): Promise<DieRoll[]>;

    /**
     * Clears all dice from the scene.
     */
    clearDice(): void;

    /**
     * Hides the scene (sets container visibility, though implementation depends on integration).
     */
    hideSelector(): void;

    /**
     * Shows the scene.
     */
    showSelector(): void;

    /**
     * Manually set the dimensions of the canvas.
     * @param dimensions Vector2-like object with x and y
     */
    setDimensions(dimensions: { x: number; y: number }): void;

    /**
     * Enables shadow casting and receiving.
     */
    enableShadows(): void;

    /**
     * Disables shadow casting and receiving.
     */
    disableShadows(): void;

    /**
     * Sets up the window resize event listener to automatically adjust canvas size.
     */
    resizeWorld(): void;

    /**
     * Sets the onRollComplete callback.
     */
    onRollComplete: (callback: (result: RollResult) => void) => void;
  }
}
