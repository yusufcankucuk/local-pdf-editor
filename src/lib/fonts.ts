import sansRegular from "../assets/NotoSans-Regular.ttf?url";
import sansBold from "../assets/NotoSans-Bold.ttf?url";
import sansItalic from "../assets/NotoSans-Italic.ttf?url";
import sansBoldItalic from "../assets/NotoSans-BoldItalic.ttf?url";
import serifRegular from "../assets/NotoSerif-Regular.ttf?url";
import serifBold from "../assets/NotoSerif-Bold.ttf?url";
import serifItalic from "../assets/NotoSerif-Italic.ttf?url";
import serifBoldItalic from "../assets/NotoSerif-BoldItalic.ttf?url";
import monoRegular from "../assets/NotoSansMono-Regular.ttf?url";
import monoBold from "../assets/NotoSansMono-Bold.ttf?url";
export const fontUrls: Record<string, string> = {
  "sans-Regular": sansRegular,
  "sans-Bold": sansBold,
  "sans-Italic": sansItalic,
  "sans-BoldItalic": sansBoldItalic,
  "serif-Regular": serifRegular,
  "serif-Bold": serifBold,
  "serif-Italic": serifItalic,
  "serif-BoldItalic": serifBoldItalic,
  "mono-Regular": monoRegular,
  "mono-Bold": monoBold,
};
export function fontKey(item: {
  font?: string;
  bold?: boolean;
  italic?: boolean;
}) {
  return `${item.font ?? "sans"}-${item.bold ? (item.italic && item.font !== "mono" ? "BoldItalic" : "Bold") : item.italic && item.font !== "mono" ? "Italic" : "Regular"}`;
}
