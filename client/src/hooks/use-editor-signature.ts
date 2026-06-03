import { useCallback, useRef, useState } from "react";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import type { ToolType } from "@/lib/edit-pdf-types";

interface UseEditorSignatureParams {
  fabricRef: MutableRefObject<any>;
  setActiveTool: Dispatch<SetStateAction<ToolType>>;
}

export function useEditorSignature({
  fabricRef,
  setActiveTool,
}: UseEditorSignatureParams) {
  const [signModalOpen, setSignModalOpen] = useState(false);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const signFabricRef = useRef<any>(null);

  const openSignModal = useCallback(async () => {
    setSignModalOpen(true);
    setTimeout(async () => {
      if (!signCanvasRef.current) return;
      const { Canvas: FabricCanvas, PencilBrush } = await import("fabric");
      if (signFabricRef.current) signFabricRef.current.dispose();
      const sc = new FabricCanvas(signCanvasRef.current, {
        isDrawingMode: true,
        backgroundColor: "#ffffff",
        width: 480,
        height: 180,
      });
      const pb = new PencilBrush(sc);
      pb.color = "#1a1a1a";
      pb.width = 3;
      sc.freeDrawingBrush = pb;
      signFabricRef.current = sc;
    }, 100);
  }, []);

  const clearSignaturePad = useCallback(() => {
    if (!signFabricRef.current) return;
    signFabricRef.current.clear();
    signFabricRef.current.backgroundColor = "#ffffff";
    signFabricRef.current.renderAll();
  }, []);

  const confirmSign = useCallback(async () => {
    if (!signFabricRef.current || !fabricRef.current) return;
    if ((signFabricRef.current.getObjects?.() || []).length === 0) return;
    const dataUrl = signFabricRef.current.toDataURL({ format: "png", quality: 0.9 });
    const { FabricImage } = await import("fabric");
    const el = new window.Image();
    el.onload = async () => {
      const fi = await FabricImage.fromURL(dataUrl);
      fi.scaleToWidth(200);
      fi.set({ left: 50, top: 50 });
      fabricRef.current.add(fi);
      fabricRef.current.setActiveObject(fi);
      fabricRef.current.renderAll();
      setActiveTool("select");
    };
    el.src = dataUrl;
    setSignModalOpen(false);
  }, [fabricRef, setActiveTool]);

  const disposeSignatureCanvas = useCallback(() => {
    signFabricRef.current?.dispose?.();
  }, []);

  return {
    signModalOpen,
    setSignModalOpen,
    signCanvasRef,
    clearSignaturePad,
    confirmSign,
    openSignModal,
    disposeSignatureCanvas,
  };
}