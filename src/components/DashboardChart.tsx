import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardChartProps {
    data: any[];
    compareMode?: boolean;
}

export function DashboardChart({ data, compareMode = false }: DashboardChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No test data available for chart
            </div>
        );
    }

    // Process data for chart
    // Assuming data structure: { created_at: string, score: number, type: 'Dysgraphia' | 'Dyscalculia' }
    // We need to merge them by date or just plot them sequentially?
    // Let's just plot the confidence scores.

    const chartData = compareMode
        ? data.reduce((acc: any[], curr) => {
            const dateStr = new Date(curr.created_at).toLocaleDateString();
            const existing = acc.find(item => item.date === dateStr);
            const scoreRaw = curr.confidence_score !== undefined ? curr.confidence_score : 0;
            const score = (scoreRaw * 100).toFixed(1);
            if (existing) {
                if (curr.type === 'Dysgraphia') existing.dysgraphia = score;
                else existing.dyscalculia = score;
            } else {
                acc.push({
                    date: dateStr,
                    dysgraphia: curr.type === 'Dysgraphia' ? score : undefined,
                    dyscalculia: curr.type === 'Dyscalculia' ? score : undefined,
                });
            }
            return acc;
        }, []).reverse()
        : data.map(item => ({
            date: new Date(item.created_at).toLocaleDateString(),
            score: ((item.confidence_score !== undefined ? item.confidence_score : 0) * 100).toFixed(1),
            type: item.type // 'Dysgraphia' or 'Dyscalculia'
        })).reverse(); // Oldest first

    return (
        <div className="h-80 w-full animate-fade-in">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tooltip-bg, #fff)' }}
                        itemStyle={{ color: 'var(--tooltip-text, #374151)' }}
                        labelStyle={{ color: 'var(--tooltip-text, #111827)' }}
                    />
                    <Legend />
                    {compareMode ? (
                        <>
                            <Line type="monotone" dataKey="dysgraphia" name="Dysgraphia Score" stroke="#8b5cf6" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                            <Line type="monotone" dataKey="dyscalculia" name="Dyscalculia Score" stroke="#ec4899" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                        </>
                    ) : (
                        <Line
                            type="monotone"
                            dataKey="score"
                            name="Performance Score"
                            stroke="#2563eb"
                            strokeWidth={3}
                            activeDot={{ r: 8 }}
                            dot={{ r: 4, strokeWidth: 2 }}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
