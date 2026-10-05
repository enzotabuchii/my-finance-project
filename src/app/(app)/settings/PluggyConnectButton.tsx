"use client";
import { useState, useCallback } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { addPluggyItemAction } from "@/app/actions/settings";
import { Plus } from "lucide-react";

export function PluggyConnectButton() {
  const [connectToken, setConnectToken] = useState<string | null>(null);

  const startConnect = async () => {
    const res = await fetch("/api/pluggy/token");
    const data = await res.json();
    if (data.accessToken) {
      setConnectToken(data.accessToken);
    } else {
      alert("Erro ao gerar token: " + data.error);
    }
  };

  const onSuccess = useCallback(async (itemData: { item: { id: string } }) => {
    setConnectToken(null);
    await addPluggyItemAction(itemData.item.id);
  }, []);

  const onError = useCallback((error: any) => {
    console.error("Pluggy error:", error);
    setConnectToken(null);
  }, []);

  return (
    <>
      <button
        onClick={startConnect}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <Plus className="h-4 w-4" />
        Conectar Banco
      </button>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={true}
          onSuccess={onSuccess}
          onError={onError}
          onClose={() => setConnectToken(null)}
        />
      )}
    </>
  );
}
