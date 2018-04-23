import { Encoding } from "@magic/mscorelib";

/// <summary>
/// functionality required by the GUI namespace from the Environment class.
/// </summary>
export interface IEnvironment {

  Language: string;

  SpecialNumpadPlusChar: boolean;

  SpecialOldZorder: boolean;

  SpecialRestoreMaximizedForm: boolean;

  SpecialIgnoreBGinModify: boolean;

  IgnoreReplaceDecimalSeparator: boolean;

  // instruct how to refer a forward slash - either as a relative web url, or as a file in the file system.
  ForwardSlashUsage: string;

  GetDateMode(compIdx: number): string;

  GetCentury(compIdx: number): number;

  GetDate(): string;

  GetTime(): string;

  GetDecimal(): string;

  CanReplaceDecimalSeparator(): boolean;

  GetThousands(): string;

  GetDefaultColor(): number;

  GetDefaultFocusColor(): number;

  GetTooltipTimeout(): number;

  GetSpecialEditLeftAlign(): boolean;

  GetGUID(): string;

  GetControlsPersistencyPath(): string;

  GetImeAutoOff(): boolean;

  GetLocalAs400Set(): boolean;

  GetLocalFlag(f: string): boolean;

  GetSignificantNumSize(): number;

  GetDebugLevel(): number;

  GetEncoding(): Encoding;

  GetDropUserFormats(): string;

  GetSpecialEngLogon(): boolean;

  GetSpecialIgnoreButtonFormat(): boolean;

  GetSpecialSwfControlNameProperty(): boolean;

  GetSpecialLogInternalExceptions(): boolean;

  GetSpecialTextSizeFactoring(): boolean;

  GetSpecialFlatEditOnClassicTheme(): boolean;

  GetSpecialOldZorder(): boolean;

  GetSpecialDisableMouseWheel(): boolean;
}
