import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart")

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const cartRef = useRef<Product[]>()

  useEffect(() => {
    cartRef.current = cart
  })

  const cartPrevVal = cartRef.current ?? cart

  useEffect(() => {
    if (cartPrevVal !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPrevVal])

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart]

      const isAlreadyAdded = updatedCart.find((prod) => (
        prod.id === productId
      ));

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount

      const currentAmount = isAlreadyAdded ? isAlreadyAdded.amount : 0
      const addedAmount = currentAmount + 1

      if (addedAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (isAlreadyAdded) {
        isAlreadyAdded.amount = addedAmount
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct)
      }
      setCart(updatedCart)
    } catch {
      toast.error("Erro na adição do produto");
      return
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const removedIndex = updatedCart.findIndex((product) => (productId === product.id)
      );

      if (removedIndex >= 0) {
        updatedCart.splice(removedIndex, 1)
        setCart(updatedCart);
      } else {
        throw Error()
      }
    } catch {
      toast.error("Erro na remoção do produto");
      return
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = [...cart]
      const existingProduct = updatedCart.find((prod) => (
        prod.id === productId
      ));

      if (existingProduct) {
        existingProduct.amount = amount
        setCart(updatedCart)
      } else {
        throw Error()
      }

    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
