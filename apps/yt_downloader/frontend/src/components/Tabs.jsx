export default function Tabs({ activeTab, setActiveTab }) {
    return (
        <nav className="tabs flex border-b border-white/10 mb-6">
            <button
                onClick={() => setActiveTab('batch')}
                className={`tab-btn flex-1 py-3 px-6 text-lg font-bold ${activeTab === 'batch' ? 'active' : ''}`}
            >
                ⚡ Quick & Batch Enqueue
            </button>
            <button
                onClick={() => setActiveTab('analyzer')}
                className={`tab-btn flex-1 py-3 px-6 text-lg font-bold ${activeTab === 'analyzer' ? 'active' : ''}`}
            >
                🔍 Advanced Video Analyzer
            </button>
        </nav>
    );
}