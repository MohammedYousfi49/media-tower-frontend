// src/pages/admin/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from 'recharts';
// --- CORRECTION : Suppression des imports inutilisés ---
import { DollarSign, Users, ShoppingCart, ArchiveX, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Card from '../../components/ui/Card';
import axiosClient from '../../api/axiosClient';

// --- Interfaces (inchangées) ---
interface KpiDto {
    newOrders: number;
    newOrdersChangePercentage: number;
    newUsers: number;
    newUsersChangePercentage: number;
    outOfStockProducts: number;
    pendingOrders: number;
    averageOrderValue: number;
    averageOrderValueChangePercentage: number;
}
interface RevenueDto {
    revenueLast30Days: number;
    revenueChangePercentage: number;
}
interface ChartDataPoint { date: string; amount: number; }
interface TopProductDto { productId: number; productName: string; productImageUrl: string; totalSold: number; }
interface CategoryRevenueDto { categoryId: number; categoryName: string; totalRevenue: number; }
interface DashboardData {
    kpis: KpiDto;
    revenue: RevenueDto;
    salesLast30Days: ChartDataPoint[];
    topSellingProducts: TopProductDto[];
    revenueByCategories: CategoryRevenueDto[];
}


// --- COMPOSANTS INTERNES ---

const KpiCard = ({ title, value, percentage, icon: Icon, link }: { title: string, value: string | number, percentage: number, icon: React.ElementType, link?: string }) => {
    const TrendIcon = percentage >= 0 ? TrendingUp : TrendingDown;
    const trendColor = percentage >= 0 ? 'text-green-400' : 'text-red-400';

    const content = (
        <Card className="flex flex-col justify-between h-full p-4 hover:border-primary transition-colors duration-300">
            <div className="flex justify-between items-center text-gray-400">
                <span>{title}</span>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-3xl font-bold text-white mt-2">{value}</p>
                <div className="flex items-center text-sm mt-1">
                    <TrendIcon size={16} className={`mr-1 ${trendColor}`} />
                    <span className={trendColor}>{percentage.toFixed(1)}%</span>
                    <span className="text-gray-500 ml-1">vs 30j</span>
                </div>
            </div>
        </Card>
    );

    return link ? <Link to={link} className="h-full block">{content}</Link> : <div className="h-full">{content}</div>;
};

const TopSellingProducts = ({ products }: { products: TopProductDto[] }) => (
    <Card>
        <h2 className="text-xl font-bold mb-4 text-white">Produits les Plus Vendus</h2>
        {products.length > 0 ? (
            <ul className="space-y-4">
                {products.map(p => (
                    <li key={p.productId} className="flex items-center space-x-4 transition-colors hover:bg-gray-800/50 p-2 rounded-lg">
                        <img src={p.productImageUrl || 'https://via.placeholder.com/40x40/161b22/30363d?text=N/A'} alt={p.productName} className="w-10 h-10 rounded-md object-cover" />
                        <div className="flex-grow"><p className="font-semibold text-white">{p.productName}</p></div>
                        <p className="text-gray-400 font-mono text-lg">{p.totalSold} <span className="text-sm">vendus</span></p>
                    </li>
                ))}
            </ul>
        ) : <div className="text-center py-10 text-gray-500">Aucune vente de produit enregistrée.</div> }
    </Card>
);

const RevenueByCategory = ({ categories }: { categories: CategoryRevenueDto[] }) => {
    const COLORS = ['#a855f7', '#22d3ee', '#f59e0b', '#10b981', '#ef4444'];

    return (
        <Card>
            <h2 className="text-xl font-bold mb-4 text-white">Revenus par Catégorie</h2>
            {categories.length > 0 ? (
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={categories} dataKey="totalRevenue" nameKey="categoryName" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                {/* --- CORRECTION : `entry` est remplacé par `_` car il n'est pas utilisé --- */}
                                {categories.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }} formatter={(value: number) => `${value.toFixed(2)} DH`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : <div className="text-center py-24 text-gray-500">Aucune donnée de catégorie.</div>}
        </Card>
    );
};

// --- LE DASHBOARD PRINCIPAL ---

const Dashboard = () => {
    const [summary, setSummary] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axiosClient.get<DashboardData>('/stats/dashboard-summary');
                setSummary(response.data);
            } catch (error) { console.error("Failed to fetch dashboard data", error); }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    if (loading) return <div className="flex justify-center items-center h-full text-white">Chargement des statistiques...</div>;
    if (!summary) return <div className="text-center text-red-400">Erreur de chargement des données du tableau de bord.</div>;

    const { kpis, revenue, salesLast30Days, topSellingProducts, revenueByCategories } = summary;
    const formattedChartData = salesLast30Days.map(d => ({ date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), Revenu: d.amount }));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <KpiCard title="Revenu (30j)" value={`${revenue.revenueLast30Days.toFixed(2)} DH`} percentage={revenue.revenueChangePercentage} icon={DollarSign} />
                <KpiCard title="Nouvelles Commandes" value={kpis.newOrders} percentage={kpis.newOrdersChangePercentage} icon={ShoppingCart} link="/admin/orders" />
                <KpiCard title="Panier Moyen" value={`${kpis.averageOrderValue.toFixed(2)} DH`} percentage={kpis.averageOrderValueChangePercentage} icon={Wallet} />
                <KpiCard title="Nouveaux Utilisateurs" value={kpis.newUsers} percentage={kpis.newUsersChangePercentage} icon={Users} link="/admin/users" />
                <KpiCard title="Rupture de Stock" value={kpis.outOfStockProducts} percentage={0} icon={ArchiveX} link="/admin/products" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <h2 className="text-xl font-bold mb-4 text-white">Performance des Ventes</h2>
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                                    <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `${v} DH`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d' }} formatter={(value: number) => `${value.toFixed(2)} DH`} />
                                    <Area type="monotone" dataKey="Revenu" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <RevenueByCategory categories={revenueByCategories} />
                </div>
            </div>

            <TopSellingProducts products={topSellingProducts} />
        </div>
    );
};

export default Dashboard;