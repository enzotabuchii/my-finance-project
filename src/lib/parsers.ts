import crypto from "crypto";
import { normalize } from "./format";

export interface ParsedTransaction {
  id: string;
  date: string; // ISO string
  description: string;
  amount: number;
  memo?: string;
}

export interface ParsedStatement {
  institution?: string;
  accountNumber?: string;
  balance?: number;
  transactions: ParsedTransaction[];
}

function hashString(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 20);
}

/**
 * Converte data em vários formatos para objeto Date.
 * Suporta: YYYYMMDD (OFX), DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
 */
function parseAnyDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  // OFX formato YYYYMMDD ou YYYYMMDDHHMMSS...
  if (/^\d{8}/.test(s)) {
    const y = parseInt(s.slice(0, 4), 10);
    const m = parseInt(s.slice(4, 6), 10) - 1;
    const d = parseInt(s.slice(6, 8), 10);
    return new Date(Date.UTC(y, m, d, 12, 0, 0));
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const d = parseInt(brMatch[1], 10);
    const m = parseInt(brMatch[2], 10) - 1;
    const y = parseInt(brMatch[3], 10);
    return new Date(Date.UTC(y, m, d, 12, 0, 0));
  }

  // YYYY-MM-DD ou YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return new Date(Date.UTC(y, m, d, 12, 0, 0));
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normaliza valores monetários brasileiros e internacionais.
 * Identifica débitos por sinal negativo (-) ou sufixo D/d ou coluna de tipo.
 */
function parseAmount(raw: string, typeHint: string = ""): number {
  let s = raw.trim().replace(/^R\$\s*/i, "").replace(/\s+/g, "");
  let isDebit = false;
  let isCredit = false;

  if (s.endsWith("D") || s.endsWith("d") || s.startsWith("-")) {
    isDebit = true;
    s = s.replace(/[Dd\-]/g, "");
  } else if (s.endsWith("C") || s.endsWith("c") || s.startsWith("+")) {
    isCredit = true;
    s = s.replace(/[Cc\+]/g, "");
  }

  if (typeHint) {
    const normHint = normalize(typeHint);
    if (
      normHint.includes("deb") ||
      normHint.includes("sai") ||
      normHint.includes("pag") ||
      normHint === "d" ||
      normHint === "debit"
    ) {
      isDebit = true;
    }
    if (
      normHint.includes("cred") ||
      normHint.includes("ent") ||
      normHint.includes("rec") ||
      normHint === "c" ||
      normHint === "credit"
    ) {
      isCredit = true;
    }
  }

  // Identifica formato brasileiro: 1.234,56
  if (s.includes(",") && s.includes(".")) {
    if (s.indexOf(".") < s.indexOf(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }

  const val = parseFloat(s);
  if (isNaN(val)) return 0;

  if (isDebit) return -Math.abs(val);
  if (isCredit) return Math.abs(val);
  return val;
}

/**
 * Parser de arquivo OFX (padrão bancário nacional).
 * Suporta tags no estilo SGML (sem fechamento) e XML padrão.
 */
export function parseOFX(content: string, accountIdHint: string = ""): ParsedStatement {
  const getTag = (block: string, tag: string): string => {
    const m = block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, "i"));
    return m ? m[1].trim() : "";
  };

  const bankId = getTag(content, "BANKID");
  const acctId = getTag(content, "ACCTID");
  const balStr = getTag(content, "BALAMT");
  const balance = balStr ? parseFloat(balStr.replace(",", ".")) : undefined;

  const matches =
    content.match(/<STMTTRN>[\s\S]*?(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi) || [];

  const transactions: ParsedTransaction[] = [];

  for (const block of matches) {
    const type = getTag(block, "TRNTYPE");
    const rawDate = getTag(block, "DTPOSTED");
    const amountStr = getTag(block, "TRNAMT");
    const fitid = getTag(block, "FITID");
    const memo = getTag(block, "MEMO");
    const name = getTag(block, "NAME");

    const date = parseAnyDate(rawDate);
    if (!date) continue;

    let amount = parseFloat(amountStr.replace(",", "."));
    if (isNaN(amount)) continue;

    // Se o tipo for DEBIT e o valor veio positivo, inverte o sinal
    if (type.toUpperCase() === "DEBIT" && amount > 0) {
      amount = -amount;
    } else if (type.toUpperCase() === "CREDIT" && amount < 0) {
      amount = Math.abs(amount);
    }

    const description = (memo || name || "Transação").replace(/\s+/g, " ").trim();
    const dateIso = date.toISOString();

    // Id único: se tiver FITID do banco usamos ele, senão fazemos hash determinístico
    const externalId = fitid
      ? `ofx_${fitid.trim().replace(/[^a-zA-Z0-9_-]/g, "")}`
      : `ofx_${hashString(`${accountIdHint}_${dateIso.slice(0, 10)}_${description}_${amount.toFixed(2)}`)}`;

    transactions.push({
      id: externalId,
      date: dateIso,
      description,
      amount,
      memo: memo !== description ? memo : undefined,
    });
  }

  return {
    institution: bankId ? `Banco (${bankId})` : undefined,
    accountNumber: acctId || undefined,
    balance: isNaN(balance as number) ? undefined : balance,
    transactions,
  };
}

/**
 * Parser de arquivo CSV.
 * Suporta separadores vírgula, ponto-e-vírgula e tabulação.
 * Tenta encontrar automaticamente colunas de data, descrição, valor e tipo.
 */
export function parseCSV(content: string, accountIdHint: string = ""): ParsedStatement {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { transactions: [] };
  }

  // Detecta delimitador pela primeira linha de cabeçalho
  const sample = lines[0];
  let delimiter = ",";
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) delimiter = ";";
  else if (tabs > commas && tabs > semicolons) delimiter = "\t";

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, "").trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, "").trim());
    return result;
  }

  // Procura a linha de cabeçalho
  let headerIndex = -1;
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let typeCol = -1;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = splitLine(lines[i]).map((c) => normalize(c));
    const dIdx = cols.findIndex(
      (c) =>
        c === "data" ||
        c === "date" ||
        c.includes("data da") ||
        c.includes("data do") ||
        c.includes("data lanc") ||
        c === "dia"
    );
    const vIdx = cols.findIndex(
      (c) =>
        c === "valor" ||
        c === "amount" ||
        c.includes("valor (r$)") ||
        c.includes("valor r$") ||
        c === "quantia"
    );
    const descIdx = cols.findIndex(
      (c) =>
        c === "descricao" ||
        c === "description" ||
        c === "titulo" ||
        c === "title" ||
        c === "historico" ||
        c === "memo" ||
        c === "identificador" ||
        c === "estabelecimento" ||
        c === "detalhe" ||
        c === "origem"
    );

    if (dIdx !== -1 && vIdx !== -1) {
      headerIndex = i;
      dateCol = dIdx;
      amountCol = vIdx;
      descCol = descIdx !== -1 ? descIdx : (dIdx === 0 && vIdx === 1 ? 2 : 1);
      typeCol = cols.findIndex((c) => c === "tipo" || c === "natureza" || c === "d/c" || c === "operacao");
      break;
    }
  }

  // Fallback caso não ache cabeçalho formal mas tenha colunas óbvias
  if (headerIndex === -1) {
    headerIndex = 0;
    dateCol = 0;
    descCol = 1;
    amountCol = 2;
  }

  const transactions: ParsedTransaction[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length <= Math.max(dateCol, amountCol)) continue;

    const rawDate = cols[dateCol];
    const rawDesc = descCol < cols.length ? cols[descCol] : "";
    const rawAmount = cols[amountCol];
    const rawType = typeCol !== -1 && typeCol < cols.length ? cols[typeCol] : "";

    const date = parseAnyDate(rawDate);
    if (!date) continue;

    const amount = parseAmount(rawAmount, rawType);
    if (amount === 0 && !rawAmount.includes("0")) continue;

    const description = (rawDesc || "Transação sem descrição").replace(/\s+/g, " ").trim();
    const dateIso = date.toISOString();

    const externalId = `csv_${hashString(
      `${accountIdHint}_${dateIso.slice(0, 10)}_${description}_${amount.toFixed(2)}`
    )}`;

    transactions.push({
      id: externalId,
      date: dateIso,
      description,
      amount,
    });
  }

  return { transactions };
}
