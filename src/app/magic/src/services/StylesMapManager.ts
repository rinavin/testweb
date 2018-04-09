import {MagicProperties} from "@magic/utils"
import {isNullOrUndefined} from "util";
import {NString} from "@magic/mscorelib"

export class StylesMapManager {
  static StylesMap: Map<string, any> = new Map<string, any>(
    [
      [MagicProperties.LineDivider, new Map<any, any>([[true, "solid"], [false, "hidden"]])],
      [MagicProperties.ImageFile, "url('\{0}\')"],
      [MagicProperties.Wallpaper, "url('\{0}\')"]
    ]
  );

  static MagicPropertyToHtmlAttributeMap: Map<string, string> = new Map<string, string>(
    [
      [MagicProperties.LineDivider, "border-bottom-style"],
      [MagicProperties.ImageFile, "background-image"],
      [MagicProperties.Wallpaper, "background-image"]
    ]
  );

  static magicValueGetStyle(styleName: string, magicValue: any): string {
    let style: string = "";

    if (!isNullOrUndefined(magicValue)) {
      let value = StylesMapManager.StylesMap.get(styleName);
      if (value.constructor === Map) {
        style = value.get(magicValue);
      }
      else if (value.constructor === String) {
        style = NString.Format(value, magicValue);
      }
    }

    return style;
  }
}
