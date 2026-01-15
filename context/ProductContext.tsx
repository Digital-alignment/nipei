import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, AudioSlot } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ProductContextType {
    products: Product[];
    loading: boolean;
    addProduct: (product: Product) => Promise<void>;
    updateProduct: (product: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    logProductionAction: (productId: string, actionType: 'produced' | 'sent' | 'problem', quantity: number, description?: string, imageUrl?: string, expectedArrivalDate?: string) => Promise<void>;
    createShipment: (data: { description: string, voucherUrl: string, packageUrl: string, expectedArrivalDate: string }, items: { product_id: string, quantity: number }[]) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useAuth();
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
                isVisible: item.is_visible,
                stock_quantity: item.stock_quantity || 0,
                monthly_production_goal: item.monthly_production_goal || 0
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

    const createShipment = async (
        data: { description: string, voucherUrl: string, packageUrl: string, expectedArrivalDate: string },
        items: { product_id: string, quantity: number }[]
    ) => {
        try {
            // Optimistic Update
            setProducts(prev => prev.map(p => {
                const item = items.find(i => i.product_id === p.id);
                if (item) {
                    return { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) - item.quantity) };
                }
                return p;
            }));

            const { error } = await supabase.rpc('create_shipment', {
                p_description: data.description,
                p_voucher_url: data.voucherUrl,
                p_package_url: data.packageUrl,
                p_expected_arrival_date: data.expectedArrivalDate,
                p_items: items
            });

            if (error) {
                console.error('RPC Error:', error);
                await fetchProducts(); // Rollback
                throw error;
            }
        } catch (error) {
            console.error('Error creating shipment:', error);
            throw error;
        }
    };

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
                is_visible: product.isVisible,
                stock_quantity: product.stock_quantity,
                monthly_production_goal: product.monthly_production_goal
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
                is_visible: updatedProduct.isVisible,
                stock_quantity: updatedProduct.stock_quantity,
                monthly_production_goal: updatedProduct.monthly_production_goal
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

    const logProductionAction = async (
        productId: string,
        actionType: 'produced' | 'sent' | 'problem',
        quantity: number,
        description?: string,
        imageUrl?: string,
        expectedArrivalDate?: string
    ) => {
        try {
            // Optimistic Update
            if (actionType === 'produced' || actionType === 'sent') {
                const delta = actionType === 'produced' ? quantity : -quantity;
                setProducts(prev => prev.map(p => {
                    if (p.id === productId) {
                        return { ...p, stock_quantity: Math.max(0, (p.stock_quantity || 0) + delta) };
                    }
                    return p;
                }));
            }

            // Calculate Unit Labor Cost
            let unitLaborCost = 0;
            if (actionType === 'produced' && session?.user) {
                const { data: workerSettings } = await supabase
                    .from('worker_settings')
                    .select('production_rate, payment_type')
                    .eq('user_id', session.user.id)
                    .single();

                if (workerSettings && (workerSettings.payment_type === 'production' || workerSettings.payment_type === 'mixed')) {
                    unitLaborCost = workerSettings.production_rate || 0;
                }
            }

            const { error } = await supabase.rpc('log_production_action', {
                p_product_id: productId,
                p_action_type: actionType,
                p_quantity: quantity,
                p_description: description,
                p_image_url: imageUrl,
                p_expected_arrival_date: expectedArrivalDate,
                p_unit_labor_cost: unitLaborCost
            });

            if (error) {
                // Rollback if needed (simplified: just fetch again)
                console.error('RPC Error:', error);
                await fetchProducts();
                throw error;
            }
        } catch (error) {
            console.error('Error logging production action:', error);
            alert('Erro ao registrar ação. Verifique sua conexão.');
        }
    };

    return (
        <ProductContext.Provider value={{ products, loading, addProduct, updateProduct, deleteProduct, logProductionAction, createShipment }}>
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
