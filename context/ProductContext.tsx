import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, AudioSlot } from '../types';
import { supabase } from '../lib/supabase';

interface ProductContextType {
    products: Product[];
    loading: boolean;
    addProduct: (product: Product) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            const mappedProducts: Product[] = (data || []).map(item => ({
                id: item.id,
                name: item.name,
                technicalName: item.technical_name,
                classification: item.classification,
                images: item.images || [],
                benefits: item.benefits,
                history: item.history,
                composition: item.composition,
                safetyRequirement: item.safety_requirement,
                labels: item.labels || [],
                audioSlots: item.audio_slots || [],
                isVisible: item.is_visible
            }));

            setProducts(mappedProducts);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const addProduct = async (product: Product) => {
        try {
            // Map camelCase to snake_case for DB
            const dbProduct = {
                id: product.id,
                name: product.name,
                technical_name: product.technicalName,
                classification: product.classification,
                images: product.images,
                benefits: product.benefits,
                history: product.history,
                composition: product.composition,
                safety_requirement: product.safetyRequirement,
                labels: product.labels,
                audio_slots: product.audioSlots,
                is_visible: product.isVisible
            };

            const { error } = await supabase
                .from('products')
                .insert([dbProduct]);

            if (error) throw error;

            setProducts(prev => [...prev, product]);
        } catch (error) {
            console.error('Error adding product:', error);
            alert('Erro ao adicionar produto');
        }
    };

    const updateProduct = async (updatedProduct: Product) => {
        try {
            const dbProduct = {
                name: updatedProduct.name,
                technical_name: updatedProduct.technicalName,
                classification: updatedProduct.classification,
                images: updatedProduct.images,
                benefits: updatedProduct.benefits,
                history: updatedProduct.history,
                composition: updatedProduct.composition,
                safety_requirement: updatedProduct.safetyRequirement,
                labels: updatedProduct.labels,
                audio_slots: updatedProduct.audioSlots,
                is_visible: updatedProduct.isVisible
            };

            const { error } = await supabase
                .from('products')
                .update(dbProduct)
                .eq('id', updatedProduct.id);

            if (error) throw error;

            setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        } catch (error) {
            console.error('Error updating product:', error);
            alert('Erro ao atualizar produto');
        }
    };

    const deleteProduct = async (id: string) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Erro ao excluir produto');
        }
    };

    return (
        <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct }}>
            {children}
        </ProductContext.Provider>
    );
};

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) {
        throw new Error('useProducts must be used within a ProductProvider');
    }
    return context;
};
