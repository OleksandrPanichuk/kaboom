import {
  siAmericanexpress,
  siDinersclub,
  siDiscover,
  siJcb,
  siMastercard,
  type SimpleIcon,
  siVisa,
} from "simple-icons";

export const CARD_BRAND_ICONS: Readonly<Record<string, SimpleIcon>> = {
  visa: siVisa,
  mastercard: siMastercard,
  amex: siAmericanexpress,
  discover: siDiscover,
  jcb: siJcb,
  diners: siDinersclub,
};

export const CARD_BRAND_NAMES: Readonly<Record<string, string>> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unionpay: "UnionPay",
  cartes_bancaires: "Cartes Bancaires",
};
