import { list } from "firebase/storage";

export const Colors = {
  primary_100_30: "#FFF8E730",
  primary_100: "#FFF8E7",
  primary_500: "#7EC384",
  primary_700: "#2E3A2C",
  primary_700_50: "#2E3A2C80",
  primary_700_30: "#2E3A2C40",
  primary_700_80: "#2E3A2CC0",
  accent_500: "#F9C9A7",
  accent_500_30: "#F9C9A730",
  accent_300: "#FCDCC5",
  white: "white",
  grey: "grey",
  green: "#4AA859",
  blue: "#AEE1F9",
  yellow: "#FCE97E",
  red: "#F27C8A",
  secBlue: "#2E3A2C",
  secGreen: "#FFFFFF",
  secYellow: "#2E3A2C",
  secRed: "#FFFFFF",
  black: "black",
  lightGreen: "#9AB683",
};

export const Fonts = {
  primary: "Inter",
  secondary: "Inter",
};

export const Subjects: string[] = [
  "English",
  "Spanish",
  "French",
  "Math",
  "Science",
  "Biology",
  "Phisics",
  "Art",
  "Medicine",
];

export const SubjectsIndex: number[] = [0, 1, 2, 3];

export const generageRandomUid = function (): string {
  const uid = Date.now().toString(36) + Math.random().toString(36).substr(2);
  return uid;
};

interface Translator {
  [key: string]: string;
}

const translator: Translator = {
  "\\n": "\n",
  "\\t": "\t",
  "\\n\\n": "\n\n",
};

interface CardData {
  front: string;
  back: string;
}

export const csvToJson = (csv: string, seperator1: string, seperator2: string): CardData[] => {
  let finalSeparator1 = seperator1;
  let finalSeparator2 = seperator2;
  
  if (translator[seperator2]) {
    finalSeparator2 = translator[seperator2];
  }
  if (translator[seperator1]) {
    finalSeparator1 = translator[seperator1];
  }
  
  const lines = csv.split(finalSeparator2);
  const result: CardData[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const obj: CardData = {} as CardData;
    const currentLine = lines[i].split(finalSeparator1);
    obj.front = currentLine[0]?.trim() || '';
    obj.back = currentLine[1]?.trim() || '';
    result.push(obj);
  }

  return result;
};
