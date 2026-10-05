import { getAccountsAction } from "@/app/actions/import";
import { ImportClient } from "./ImportClient";

export default async function ImportPage() {
  const accounts = await getAccountsAction();

  return <ImportClient initialAccounts={accounts} />;
}
