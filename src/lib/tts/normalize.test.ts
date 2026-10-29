import { describe, expect, it } from "vitest";
import { normalizeNumbers, parseNumber, romanValue } from "./normalize";
import { preprocessText } from "./supertonic";

type Lang = "es" | "en" | "pt" | "fr";
/** Normalized and with the spaces the reference normalization cleans up afterwards. */
const say = (text: string, lang: Lang) => normalizeNumbers(text, lang).replace(/\s+/g, " ").replace(/ ([,.!?;:])/g, "$1").trim();

function table(lang: Lang, cases: [string, string][]) {
  for (const [input, expected] of cases) expect(say(input, lang), input).toBe(expected);
}

describe("parseNumber", () => {
  it("reads separators the way each language writes them", () => {
    expect(parseNumber("1.234", "es")).toMatchObject({ int: BigInt(1234) });
    expect(parseNumber("3,5", "es")).toMatchObject({ int: BigInt(3), frac: "5", sep: "," });
    expect(parseNumber("3.5", "es")).toMatchObject({ int: BigInt(3), frac: "5", sep: "." });
    expect(parseNumber("1.234,56", "pt")).toMatchObject({ int: BigInt(1234), frac: "56", sep: "," });
    expect(parseNumber("1,234.56", "es")).toMatchObject({ int: BigInt(1234), frac: "56", sep: "." });
    expect(parseNumber("1 234 567", "fr")).toMatchObject({ int: BigInt(1234567) });
    expect(parseNumber("1,234", "en")).toMatchObject({ int: BigInt(1234) });
    expect(parseNumber("1,234,567", "en")).toMatchObject({ int: BigInt(1234567) });
    expect(parseNumber("3.25", "en")).toMatchObject({ int: BigInt(3), frac: "25" });
    expect(parseNumber("1,2", "en")).toBeNull();
    expect(parseNumber("1.2.3", "es")).toBeNull();
    expect(parseNumber("007", "es")).toMatchObject({ digits: "007" });
    expect(parseNumber("0,5", "es")).toMatchObject({ int: BigInt(0), frac: "5" });
  });
  it("knows Roman numerals", () => {
    expect(romanValue("XXI")).toBe(21);
    expect(romanValue("XIV")).toBe(14);
    expect(romanValue("MCMXCIV")).toBe(1994);
    expect(romanValue("IIII")).toBe(0);
    expect(romanValue("ABC")).toBe(0);
  });
});

describe("Spanish", () => {
  it("integers, years, decimals and gender", () => {
    table("es", [
      ["En 2026 cumplo 21 años.", "En dos mil veintiséis cumplo veintiún años."],
      ["Son 3,5 kilos.", "Son tres coma cinco kilos."],
      ["Mide 3.5 metros.", "Mide tres punto cinco metros."],
      ["Pi vale 3,14159.", "Pi vale tres coma uno cuatro uno cinco nueve."],
      ["Pesa 2,05 kilos.", "Pesa dos coma cero cinco kilos."],
      ["Vinieron 1.234 personas.", "Vinieron mil doscientas treinta y cuatro personas."],
      ["Tengo 1 casa, 1 perro y 200 páginas.", "Tengo una casa, un perro y doscientas páginas."],
      ["Hay 21 problemas.", "Hay veintiún problemas."],
      ["El número es 7.", "El número es siete."],
      ["Hace -5 grados.", "Hace menos cinco grados."],
      ["Población: 45.000.000.", "Población: cuarenta y cinco millones."],
      ["Versión 1.2.3.", "Versión uno punto dos punto tres."],
      ["2 + 2 son 4.", "dos más dos son cuatro."],
    ]);
  });
  it("dates and times", () => {
    table("es", [
      ["El 28/10/2026 llegó.", "El veintiocho de octubre de dos mil veintiséis llegó."],
      ["Vence el 01-02-26.", "Vence el primero de febrero de dos mil veintiséis."],
      ["Fecha: 2026-10-28.", "Fecha: veintiocho de octubre de dos mil veintiséis."],
      ["El 1 de mayo de 2026.", "El primero de mayo de dos mil veintiséis."],
      ["El 12 de octubre de 1492.", "El doce de octubre de mil cuatrocientos noventa y dos."],
      ["Empieza a las 14:30.", "Empieza a las catorce y treinta."],
      ["Es a las 10:00.", "Es a las diez."],
      ["Abre 9:00 hs.", "Abre nueve horas."],
      ["Termina 21:15 hs.", "Termina veintiuna y quince horas."],
      ["A la 1:05.", "A la una y cinco."],
      ["Sale a las 8:30 a. m.", "Sale a las ocho y treinta a eme."],
      ["Fecha 31/02/2026 no existe.", "Fecha treinta y uno de febrero de dos mil veintiséis no existe."],
      ["Fecha 3/45/2026 rara.", "Fecha tres/cuarenta y cinco/dos mil veintiséis rara."],
      ["Medio: 1/2, 3/4 y 2/3.", "Medio: un medio, tres cuartos y dos tercios."],
    ]);
  });
  it("percentages and money", () => {
    table("es", [
      ["Subió un 15 %.", "Subió un quince por ciento."],
      ["Bajó 3,5%.", "Bajó tres coma cinco por ciento."],
      ["Cuesta $1.500,50.", "Cuesta mil quinientos pesos con cincuenta centavos."],
      ["Son US$ 20.", "Son veinte dólares."],
      ["Son USD 1.", "Son un dólar."],
      ["Vale 3,50 €.", "Vale tres euros con cincuenta céntimos."],
      ["Vale €1.", "Vale un euro."],
      ["Son R$ 10.", "Son diez reales."],
      ["Son £2.", "Son dos libras."],
      ["Son £1.", "Son una libra."],
      ["Ganó $3 millones.", "Ganó tres millones de pesos."],
      ["Ganó US$ 1.000.000.", "Ganó un millón de dólares."],
      ["Ganó $5 mil.", "Ganó cinco mil pesos."],
      ["Debe $21.", "Debe veintiún pesos."],
    ]);
  });
  it("ordinals, Roman numerals, ranges, phones and units", () => {
    table("es", [
      ["El 1.º y la 2.ª.", "El primero y la segunda."],
      ["El 1º, la 3ª.", "El primero, la tercera."],
      ["El 1er piso y el 3er lugar.", "El primer piso y el tercer lugar."],
      ["Salió 2do y 4ta.", "Salió segundo y cuarta."],
      ["Quedó 1° en la carrera.", "Quedó primero en la carrera."],
      ["N.º 5 y nº 12.", "número cinco y número doce."],
      ["El siglo XXI.", "El siglo veintiuno."],
      ["Los siglos XIX y XX.", "Los siglos diecinueve y veinte."],
      ["Capítulo IV.", "Capítulo cuatro."],
      ["Felipe II y Luis XIV.", "Felipe segundo y Luis catorce."],
      ["Juan Pablo II viajó.", "Juan Pablo segundo viajó."],
      ["Yo vi a Ana.", "Yo vi a Ana."],
      ["Páginas 10-20.", "Páginas diez a veinte."],
      ["Entre 1990-2000.", "Entre mil novecientos noventa a dos mil."],
      ["De 10 a 20 personas.", "De diez a veinte personas."],
      ["Llamá al +54 11 4567-8901.", "Llamá al más cinco cuatro, uno uno, cuatro cinco seis siete, ocho nueve cero uno."],
      ["O al (011) 4567-8901.", "O al cero uno uno, cuatro cinco seis siete, ocho nueve cero uno."],
      ["Código 0800.", "Código cero ocho cero cero."],
      ["CBU 2850590940090418135201.", "CBU dos ocho cinco cero cinco nueve cero nueve cuatro cero cero nueve cero cuatro uno ocho uno tres cinco dos cero uno."],
      ["Hace 25 °C.", "Hace veinticinco grados Celsius."],
      ["Hace -5 °C.", "Hace menos cinco grados Celsius."],
      ["Gira 90°.", "Gira noventa grados."],
      ["Va a 90 km/h.", "Va a noventa kilómetros por hora."],
      ["Pesa 1 kg y 250 g.", "Pesa un kilo y doscientos cincuenta gramos."],
      ["Mide 1,5 m.", "Mide uno coma cinco metros."],
      ["Dura 1 h y 30 min.", "Dura una hora y treinta minutos."],
      ["Ocupa 25 MB.", "Ocupa veinticinco megabytes."],
      ["Son 100 m².", "Son cien metros cuadrados."],
      ["COVID-19 y MP3.", "COVID-diecinueve y MP tres."],
    ]);
  });
});

describe("English", () => {
  it("numbers, years and decimals", () => {
    table("en", [
      ["In 2026 I turned 21.", "In twenty twenty-six I turned twenty-one."],
      ["Born in 1984.", "Born in nineteen eighty-four."],
      ["Back in 2005.", "Back in two thousand five."],
      ["Since 1900.", "Since nineteen hundred."],
      ["It weighs 3.5 kg.", "It weighs three point five kilograms."],
      ["About 1,234 people.", "About one thousand two hundred thirty-four people."],
      ["Pi is 3.14.", "Pi is three point one four."],
      ["Count 1,2,3.", "Count one, two, three."],
      ["It's -3 outside.", "It's minus three outside."],
      ["Version 2.0.1.", "Version two point zero point one."],
      ["Add 1/2 and 3/4.", "Add one half and three quarters."],
    ]);
  });
  it("dates and times", () => {
    table("en", [
      ["On 10/28/2026 we met.", "On October twenty-eighth, twenty twenty-six we met."],
      ["On 28/10/2026 we met.", "On October twenty-eighth, twenty twenty-six we met."],
      ["On October 28, 2026.", "On October twenty-eighth, twenty twenty-six."],
      ["On Oct. 3rd.", "On October third."],
      ["On October 28, 2026 at 2:30 pm.", "On October twenty-eighth, twenty twenty-six at two thirty p m."],
      ["On 5 May 2026.", "On the fifth of May twenty twenty-six."],
      ["At 2:30 pm.", "At two thirty p m."],
      ["At 9:05.", "At nine oh five."],
      ["At 10:00.", "At ten o'clock."],
      ["At 14:30.", "At fourteen thirty."],
      ["At 14:00.", "At fourteen hundred."],
      ["At 7:00 AM.", "At seven a m."],
    ]);
  });
  it("money, percentages, ordinals, Roman numerals, ranges and phones", () => {
    table("en", [
      ["Up 15%.", "Up fifteen percent."],
      ["It costs $1,500.50.", "It costs one thousand five hundred dollars and fifty cents."],
      ["It costs $1.", "It costs one dollar."],
      ["It costs €20.", "It costs twenty euros."],
      ["It costs £3.", "It costs three pounds."],
      ["A $5 million deal.", "A five million dollars deal."],
      ["The 1st, 2nd, 3rd and 21st.", "The first, second, third and twenty-first."],
      ["The 12th and 100th.", "The twelfth and one hundredth."],
      ["World War II.", "World War two."],
      ["Henry VIII.", "Henry the Eighth."],
      ["Chapter IV.", "Chapter four."],
      ["The XXI century.", "The twenty-first century."],
      ["Pages 10-20.", "Pages ten to twenty."],
      ["From 1990-2000.", "From nineteen ninety to two thousand."],
      ["Call +1 555-123-4567.", "Call plus one, five five five, one two three, four five six seven."],
      ["Call 555-1234.", "Call five five five, one two three four."],
      ["No. 7 is next.", "number seven is next."],
      ["It's 25 °F.", "It's twenty-five degrees Fahrenheit."],
    ]);
  });
});

describe("Portuguese", () => {
  it("numbers, dates, times and money", () => {
    table("pt", [
      ["Em 2026 fiz 21 anos.", "Em dois mil e vinte e seis fiz vinte e um anos."],
      ["São 3,5 kg.", "São três vírgula cinco quilos."],
      ["Vieram 1.234 pessoas.", "Vieram mil duzentas e trinta e quatro pessoas."],
      ["Tenho 2 casas e 2 carros.", "Tenho duas casas e dois carros."],
      ["Foram 200 pessoas.", "Foram duzentas pessoas."],
      ["Dia 28/10/2026.", "Dia vinte e oito de outubro de dois mil e vinte e seis."],
      ["1º de maio de 2026.", "primeiro de maio de dois mil e vinte e seis."],
      ["1 de janeiro.", "primeiro de janeiro."],
      ["Às 14:30.", "Às catorze e trinta."],
      ["Às 2:00.", "Às duas horas."],
      ["À 1:00.", "À uma hora."],
      ["Custa R$ 50,90.", "Custa cinquenta reais e noventa centavos."],
      ["Custa R$ 1,00.", "Custa um real."],
      ["Custa R$ 2 milhões.", "Custa dois milhões de reais."],
      ["Custa US$ 10.", "Custa dez dólares."],
      ["Subiu 15%.", "Subiu quinze por cento."],
    ]);
  });
  it("ordinals, Roman numerals, ranges, phones and units", () => {
    table("pt", [
      ["O 1º e a 2ª.", "O primeiro e a segunda."],
      ["O 1.º lugar.", "O primeiro lugar."],
      ["Século XXI.", "Século vinte e um."],
      ["Dom Pedro II.", "Dom Pedro segundo."],
      ["Páginas 10-20.", "Páginas dez a vinte."],
      ["Ligue (11) 98765-4321.", "Ligue um um, nove oito sete seis cinco, quatro três dois um."],
      ["Ligue +55 21 2345-6789.", "Ligue mais cinco cinco, dois um, dois três quatro cinco, seis sete oito nove."],
      ["Faz 30 °C.", "Faz trinta graus Celsius."],
      ["Dura 2 h.", "Dura duas horas."],
      ["Nº 3.", "número três."],
      ["Use 1/4.", "Use um quarto."],
    ]);
  });
});

describe("French", () => {
  it("numbers, dates, times and money", () => {
    table("fr", [
      ["En 2026, j'ai eu 21 ans.", "En deux mille vingt-six, j'ai eu vingt et un ans."],
      ["C'est 3,5 kg.", "C'est trois virgule cinq kilos."],
      ["Il y a 1 234 personnes.", "Il y a mille deux cent trente-quatre personnes."],
      ["Il y a 1.234 personnes.", "Il y a mille deux cent trente-quatre personnes."],
      ["Ils sont 80.", "Ils sont quatre-vingts."],
      ["Il y a 81 ans.", "Il y a quatre-vingt-un ans."],
      ["Il y a 21 personnes.", "Il y a vingt et une personnes."],
      ["Le 28/10/2026.", "Le vingt-huit octobre deux mille vingt-six."],
      ["Le 1er mai 2026.", "Le premier mai deux mille vingt-six."],
      ["Le 1 mai.", "Le premier mai."],
      ["À 14h30.", "À quatorze heures trente."],
      ["À 14 h 30.", "À quatorze heures trente."],
      ["À 9h.", "À neuf heures."],
      ["À 1h.", "À une heure."],
      ["À 14:30.", "À quatorze heures trente."],
      ["À 21:00.", "À vingt et une heures."],
      ["Ça coûte 3,50 €.", "Ça coûte trois euros et cinquante centimes."],
      ["Ça coûte 80 $.", "Ça coûte quatre-vingts dollars."],
      ["Ça coûte 200 000 €.", "Ça coûte deux cent mille euros."],
      ["Ça coûte 2 millions €.", "Ça coûte deux millions de euros."],
      ["Une hausse de 15 %.", "Une hausse de quinze pour cent."],
    ]);
  });
  it("ordinals, Roman numerals, ranges, phones and units", () => {
    table("fr", [
      ["La 1re fois, le 2e, la 3ème.", "La première fois, le deuxième, la troisième."],
      ["Le 2nd.", "Le second."],
      ["Le XXIe siècle.", "Le vingt et unième siècle."],
      ["Le Ve siècle.", "Le cinquième siècle."],
      ["Louis XIV et François Ier.", "Louis quatorze et François premier."],
      ["Le chapitre IV.", "Le chapitre quatre."],
      ["Le livre est là.", "Le livre est là."],
      ["Pages 10-20.", "Pages dix à vingt."],
      ["Appelez le 01 23 45 67 89.", "Appelez le zéro un, deux trois, quatre cinq, six sept, huit neuf."],
      ["Il fait 20 °C.", "Il fait vingt degrés Celsius."],
      ["Ça pèse 5 Mo.", "Ça pèse cinq mégaoctets."],
      ["Le n° 4.", "Le numéro quatre."],
      ["Ajoutez 1/2 et 2/3.", "Ajoutez un demi et deux tiers."],
    ]);
  });
});

describe("in the model input", () => {
  it("runs before NFKD (which would turn º into o) and the language tags", () => {
    expect(preprocessText("El 1.º de 2026", "es")).toBe("<es>El primero de dos mil veintiséis.</es>".normalize("NFKD"));
    expect(preprocessText("Count 1,2,3", "en")).toBe("<en>Count one, two, three.</en>");
    expect(preprocessText("COVID-19 y MP3", "es")).toBe("<es>covid-diecinueve y eme pe tres.</es>");
  });
  it("leaves text without numbers as the reference SDK would", () => {
    expect(preprocessText("Hola, ¿qué tal?", "es")).toBe("<es>Hola, ¿qué tal?</es>".normalize("NFKD"));
    expect(preprocessText("I think so.", "en")).toBe("<en>I think so.</en>");
  });
});

describe("abbreviations and acronyms", () => {
  const pre = (text: string, lang: Lang) => preprocessText(text, lang).normalize("NFC");
  it("Spanish", () => {
    expect(pre("El Sr. Pérez y la Dra. Gómez, etc.", "es")).toBe("<es>El señor Pérez y la doctora Gómez, etcétera.</es>");
    expect(pre("Ver pág. 5 y págs. 10-12, p. 7.", "es")).toBe("<es>Ver página cinco y páginas diez a doce, página siete.</es>");
    expect(pre("Pág. 3 dice.", "es")).toBe("<es>Página tres dice.</es>");
    expect(pre("Viajó a EE. UU. con Ud., p. ej. ayer.", "es")).toBe("<es>Viajó a Estados Unidos con usted, por ejemplo ayer.</es>");
    expect(pre("Bajá el PDF con tu DNI por USB.", "es")).toBe("<es>Bajá el pe de efe con tu de ene i por u ese be.</es>");
    expect(pre("La IA, la TV y la OMS.", "es")).toBe("<es>La i a, la te ve y la o eme ese.</es>");
  });
  it("acronyms that read as words, emphasis and shouting are left alone", () => {
    // Lowercased: the model mispronounces words in capitals ("FECHA" → "feca").
    expect(pre("La NASA, la OTAN, la ONU y la UNESCO.", "es")).toBe("<es>La nasa, la otan, la onu y la unesco.</es>");
    expect(pre("NO quiero.", "es")).toBe("<es>no quiero.</es>");
    expect(pre("FECHA: hoy.", "es")).toBe("<es>fecha: hoy.</es>");
    expect(pre("NO QUIERO IR AL MÉDICO HOY.", "es")).toBe("<es>no quiero ir al médico hoy.</es>");
    expect(pre("COVID-19.", "es")).toBe("<es>covid-diecinueve.</es>");
  });
  it("English", () => {
    expect(pre("Mr. Smith and Dr. Who, e.g. this, etc.", "en")).toBe("<en>Mister Smith and Doctor Who, for example this, et cetera.</en>");
    expect(pre("See p. 5 and pp. 10-12.", "en")).toBe("<en>See page five and pages ten to twelve.</en>");
    expect(pre("The NASA PDF via USB.", "en")).toBe("<en>The nasa P D F via U S B.</en>");
    expect(pre("I think NO.", "en")).toBe("<en>I think no.</en>");
  });
  it("Portuguese", () => {
    expect(pre("O Sr. Silva e a Dra. Souza, p. ex. isso.", "pt")).toBe("<pt>O senhor Silva e a doutora Souza, por exemplo isso.</pt>");
    expect(pre("O PDF do INSS e o CPF.", "pt")).toBe("<pt>O pê dê efe do i ene esse esse e o cê pê efe.</pt>");
    expect(pre("Eu sei.", "pt")).toBe("<pt>Eu sei.</pt>");
  });
  it("French", () => {
    expect(pre("Mme Dupont et M. Martin, c.-à-d. eux, etc.", "fr")).toBe("<fr>Madame Dupont et Monsieur Martin, c'est-à-dire eux, et cetera.</fr>");
    expect(pre("Le Dr Martin.", "fr")).toBe("<fr>Le Docteur Martin.</fr>");
    expect(pre("Le PDF de la SNCF et l'ONU.", "fr")).toBe("<fr>Le pé dé effe de la esse enne cé effe et l'onu.</fr>");
    expect(pre("M. le maire.", "fr")).toBe("<fr>M. le maire.</fr>");
  });
});
