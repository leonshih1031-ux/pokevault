import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCart } from "@/lib/cartContext";
import CheckoutModal from "@/components/marketplace/CheckoutModal";

function CartPanel({ cartOpen, setCartOpen, setCheckoutOpen }) {
  const { items, removeItem, clear, count } = useCart();
  const totalWithFees = items.reduce((s, i) => s + (i.asking_price || 0) + (i.asking_price * (i.platform_fee || 3) / 100), 0);

  return (
    <Dialog open={cartOpen} onOpenChange={setCartOpen}>
      <DialogContent className="bg-[#181b22] border-white/10 text-slate-100 max-w-lg max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" /> Cart · {count} item{count !== 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        {items.length === 0 ? (
          <div className="text-sm text-slate-500 py-8 text-center">Your cart is empty. Add cards from the marketplace!</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg bg-white/5 p-2.5">
                <img src={it.image_small} alt={it.name} className="w-10 h-14 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                  <div className="text-[11px] text-slate-500">{it.set_name} · #{it.number} · {it.condition}</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">${(it.asking_price || 0).toFixed(2)}</div>
                </div>
                <button onClick={() => removeItem(it.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-white/10">
              <span className="text-slate-400">Subtotal</span>
              <span className="font-bold">${items.reduce((s, i) => s + (i.asking_price || 0), 0).toFixed(2)}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Truck className="w-3 h-3" /> Combined shipping calculated at checkout — all cards ship in one package</div>
          </div>
        )}
        {items.length > 0 && (
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => { setCartOpen(false); setCheckoutOpen(true); }} className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#0e1014]">
              <Truck className="w-4 h-4 mr-1.5" /> Checkout · ${totalWithFees.toFixed(2)}
            </Button>
            <Button onClick={clear} variant="ghost" className="w-full text-slate-400">Clear cart</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CartButton({ variant = "sidebar" }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <>
      {variant === "sidebar" ? (
        <button onClick={() => setCartOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.03] transition-all relative">
          <ShoppingCart className="w-[18px] h-[18px]" />
          Cart
          {count > 0 && <span className="absolute right-3 bg-emerald-500 text-[#0e1014] text-[10px] font-bold min-w-5 h-5 px-1 rounded-full grid place-items-center">{count}</span>}
        </button>
      ) : (
        <Button onClick={() => setCartOpen(true)} variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 relative">
          <ShoppingCart className="w-4 h-4 mr-1.5" /> Cart
          {count > 0 && <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-[#0e1014] text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center">{count}</span>}
        </Button>
      )}

      <CartPanel cartOpen={cartOpen} setCartOpen={setCartOpen} setCheckoutOpen={setCheckoutOpen} />
      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} onPlaced={() => navigate('/marketplace')} />
    </>
  );
}