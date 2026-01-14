import React from 'react';
import InventoryGrid from '../components/InventoryGrid';
import ProductionLogList from '../components/ProductionLogList';

const Inventory: React.FC = () => {
    return (
        <div className="min-h-screen bg-black">
            <InventoryGrid />
            <div className="px-4">
                <ProductionLogList />
            </div>
        </div>
    );
};

export default Inventory;
