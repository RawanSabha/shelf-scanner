import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Camera, Library, Upload, Trash2, PlusCircle, Brain, BookOpen } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const BookCard = ({ id, title, author, genre, reason, index, onDelete, onAdd }) => {
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    let isMounted = true; 
    const fetchCover = async () => {
      try {
        const query = encodeURIComponent(`${title} ${author}`);
        const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=1`);
        const data = await response.json();
        if (isMounted && data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
          setCoverUrl(`https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-M.jpg`);
        }
      } catch (error) {
        console.error("Network error fetching cover", title);
      }
    };
    const delayTimer = setTimeout(() => fetchCover(), index * 300);
    return () => { isMounted = false; clearTimeout(delayTimer); };
  }, [title, author, index]);

  return (
    <li className="flex flex-col sm:flex-row gap-4 p-4 mb-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="w-20 h-28 bg-gray-100 rounded-md shrink-0 overflow-hidden flex items-center justify-center border border-gray-200 shadow-inner max-sm:mx-auto">
        {coverUrl ? (
          <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="text-gray-400 w-8 h-8" />
        )}
      </div>
      <div className="flex-grow flex flex-col justify-center text-center sm:text-left">
        <h3 className="font-semibold text-lg text-gray-800 leading-tight">{title}</h3>
        <p className="text-gray-500 text-sm mt-1">by {author}</p>
        
        {genre && (
          <span className="inline-block self-center sm:self-start bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-xs mt-3 font-medium">
            {genre}
          </span>
        )}

        {reason && (
          <p className="mt-3 text-sm text-indigo-600 italic border-l-2 border-indigo-200 pl-3">
            {reason}
          </p>
        )}
      </div>
      
      <div className="flex sm:flex-col justify-center gap-2 sm:ml-auto shrink-0 justify-end mt-2 sm:mt-0">
        {onAdd && (
          <button 
            onClick={() => onAdd({ title, author, genre: genre || "Uncategorized" })} 
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusCircle size={16} /> Save
          </button>
        )}
        {onDelete && (
          <button 
            onClick={() => onDelete(id)} 
            className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} /> Remove
          </button>
        )}
      </div>
    </li>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner'); 
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [scanResults, setScanResults] = useState(null); 
  const [saveStatus, setSaveStatus] = useState('');
  const [myLibrary, setMyLibrary] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [smartRecs, setSmartRecs] = useState(null);

  const handleImageCapture = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setImageFiles(filesArray);
      setPreviewUrls(filesArray.map(file => URL.createObjectURL(file)));
      setUploadStatus(''); 
      setScanResults(null); 
      setSaveStatus('');
    }
  };

  const handleUpload = async () => {
    if (imageFiles.length === 0) return;
    setIsAnalyzing(true);
    setUploadStatus(`Analyzing ${imageFiles.length} photos...`);
    setScanResults(null); 
    setSaveStatus('');
    const formData = new FormData();
    imageFiles.forEach(file => formData.append('images', file));

    try {
      const response = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (response.ok) {
        setUploadStatus('Analysis Complete');
        setScanResults(data.data);
      } else {
         setUploadStatus('Failed to analyze');
      }
    } catch (error) { 
        setUploadStatus('Connection error.'); 
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!scanResults || !scanResults.scannedBooks) return;
    setSaveStatus('Saving all...');
    try {
      const response = await fetch('http://localhost:5000/api/library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: scanResults.scannedBooks }),
      });
      const data = await response.json();
      if (response.ok) {
        setSaveStatus('Success! Vault updated.');
        if (activeTab === 'dashboard') fetchLibraryData(); 
      }
    } catch (error) { setSaveStatus('Error saving out.'); }
  };

  const handleAddSingleBook = async (book) => {
    try {
      const response = await fetch('http://localhost:5000/api/library', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books: [book] }), 
      });
      if (response.ok) {
        alert(`"${book.title}" added to your Vault!`);
        if (activeTab === 'dashboard') fetchLibraryData();
      }
    } catch (error) { console.error("Failed to add book", error); }
  };

  const fetchLibraryData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/library');
      const data = await response.json();
      
      if (!response.ok || !Array.isArray(data)) {
        console.error("Failed to fetch library data, server returned:", data);
        setMyLibrary([]);
        setChartData([]);
        return;
      }
      
      setMyLibrary(data);
      const authorCounts = data.reduce((acc, book) => {
        if (book.author) acc[book.author] = (acc[book.author] || 0) + 1;
        return acc;
      }, {});
      const chartFormat = Object.keys(authorCounts).map(author => ({ name: author, value: authorCounts[author] }));
      setChartData(chartFormat);
    } catch (error) { 
      console.error("Failed to fetch library", error);
      setMyLibrary([]);
      setChartData([]);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/library/${bookId}`, { method: 'DELETE' });
      if (response.ok) fetchLibraryData();
    } catch (error) { console.error("Failed to delete book", error); }
  };

  const handleGetSmartRecs = async () => {
    setIsMatching(true);
    try {
      const response = await fetch('http://localhost:8000/api/smart-recommend');
      const data = await response.json();
      setSmartRecs(data.recommendations);
    } catch (error) { 
      console.error("Failed to fetch Python recs", error); 
    } finally {
      setIsMatching(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dashboard') fetchLibraryData();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-6 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-blue-600" /> Shelf Scanner
          </h1>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('scanner')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'scanner' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Camera size={16} /> Scan
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Library size={16} /> Vault
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {activeTab === 'scanner' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Upload Area */}
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
              <input type="file" multiple accept="image/*" id="cameraInput" className="hidden" onChange={handleImageCapture} />
              <button 
                onClick={() => document.getElementById('cameraInput').click()} 
                className="mx-auto flex flex-col items-center gap-3 w-full max-w-sm border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-50 transition-colors rounded-xl p-8 cursor-pointer"
              >
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <Camera size={32} />
                </div>
                <span className="text-blue-700 font-medium">Select Shelf Photos</span>
              </button>

              {previewUrls.length > 0 && (
                <div className="mt-8">
                  <div className="flex flex-wrap justify-center gap-4 mb-6">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        <img src={url} alt={`Preview`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleUpload} 
                    disabled={isAnalyzing}
                    className="mx-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed min-w-[200px]"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload size={20} /> Analyze Shelf
                      </>
                    )}
                  </button>
                  
                  {uploadStatus && !isAnalyzing && (
                    <p className="mt-4 text-sm font-medium text-gray-600 bg-gray-100 py-2 px-4 rounded-full inline-block">
                      {uploadStatus}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Results Area */}
            {scanResults && (
              <div className="grid md:grid-cols-2 gap-8">
                {/* Scanned Books */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      Your Shelf
                    </h2>
                    <button 
                      onClick={handleSaveToLibrary} 
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-colors"
                    >
                      {saveStatus || 'Save All'}
                    </button>
                  </div>
                  <ul className="space-y-4">
                    {scanResults.scannedBooks.map((book, index) => (
                      <BookCard 
                        key={index} 
                        title={book.title} 
                        author={book.author} 
                        genre={book.genre} 
                        index={index} 
                        onAdd={handleAddSingleBook} 
                      />
                    ))}
                  </ul>
                </div>
                
                {/* Recommendations */}
                <div className="space-y-4">
                  <div className="mb-4">
                     <h2 className="text-xl font-semibold text-indigo-800 flex items-center gap-2">
                        <Brain className="text-indigo-500" /> AI Suggestions
                     </h2>
                     <p className="text-sm text-gray-500 mt-1">Found instantly from your shelf scan</p>
                  </div>
                  <ul className="space-y-4">
                    {scanResults.recommendations.map((rec, index) => (
                      <BookCard 
                        key={index} 
                        title={rec.title} 
                        author={rec.author} 
                        reason={rec.reason} 
                        index={index + 20} 
                        onAdd={handleAddSingleBook} 
                      />
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-500 align-top">
            {/* Left Column: Recommendations */}
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                       <Brain className="text-indigo-600 w-5 h-5"/> Deep Match AI
                    </h2>
                    <p className="text-sm text-indigo-600/80 mt-1">Based on your entire vault history</p>
                  </div>
                  <button 
                    onClick={handleGetSmartRecs} 
                    disabled={isMatching}
                    className="flex shrink-0 items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-70"
                  >
                    {isMatching ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Find Matches'}
                  </button>
                </div>
                
                {smartRecs && (
                  <ul className="space-y-4 mt-6">
                    {smartRecs.map((rec, index) => (
                      <BookCard 
                        key={index} 
                        title={rec.title} 
                        author={rec.author} 
                        reason={rec.reason} 
                        index={index + 30} 
                        onAdd={handleAddSingleBook} 
                      />
                    ))}
                  </ul>
                )}
                {!smartRecs && !isMatching && (
                   <div className="text-center py-8 text-indigo-300">
                     <p className="text-sm">Click "Find Matches" to discover your next favorite book.</p>
                   </div>
                )}
              </div>

              {/* Analytics */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Author Distribution</h2>
                <div className="h-64 w-full">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                          {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                          itemStyle={{ color: '#4b5563' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                      Not enough data yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Collection */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Your Vault</h2>
                <span className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-semibold">
                  {myLibrary.length} Books
                </span>
              </div>
              <ul className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {myLibrary.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Library className="mx-auto w-12 h-12 mb-3 opacity-50" />
                    <p className="text-sm">Your vault is empty.<br/>Scan some books to get started!</p>
                  </div>
                ) : (
                  myLibrary.map((book, index) => (
                    <BookCard 
                      key={book._id} 
                      id={book._id} 
                      title={book.title} 
                      author={book.author} 
                      genre={book.genre} 
                      index={index} 
                      onDelete={handleDeleteBook} 
                    />
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}