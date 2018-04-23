export class NumberFormatInfo {
  public static readonly NegativeSign: string = '-';

  public static readonly NumberDecimalSeparator: string = NumberFormatInfo.GetLocaleDecimalSeperator();

  private static GetLocaleDecimalSeperator(): string {
    return (1.1).toLocaleString()[1]; // get the decimal seperator of current locale
  }
}
