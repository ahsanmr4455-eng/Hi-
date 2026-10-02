import {
  Download,
  Eye,
  File,
  FileCode,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  MoreVertical,
  MoveRight,
  Music,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  addWorkspaceFile,
  createFolder,
  deleteFolder,
  deleteWorkspaceFile,
  renameFolder,
  renameWorkspaceFile,
  subscribeWorkspaceFiles,
  subscribeWorkspaceFolders
} from '../../services/workspaceService';
import {
  DownloadProgressItem,
  Folder as FolderType,
  UploadProgressItem,
  WorkspaceFile
} from '../../types/workspace';

export const WorkspaceView: React.FC = () => {
  const { currentUser, activeWorkspace } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals & Active Tasks
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [previewFile, setPreviewFile] = useState<WorkspaceFile | null>(null);
  const [editingFile, setEditingFile] = useState<WorkspaceFile | null>(null);
  const [newFileNameInput, setNewFileNameInput] = useState('');

  // Active Progress Lists
  const [activeUploads, setActiveUploads] = useState<UploadProgressItem[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgressItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const canUpload = currentUser?.role === 'admin' || currentUser?.role === 'team';
  const canModify = currentUser?.role === 'admin';

  // Real-time Firestore Subscriptions
  useEffect(() => {
    if (!activeWorkspace) return;

    const unsubFolders = subscribeWorkspaceFolders(activeWorkspace.id, (folderList) => {
      setFolders(folderList);
    });

    const unsubFiles = subscribeWorkspaceFiles(activeWorkspace.id, (fileList) => {
      setFiles(fileList);
    });

    return () => {
      unsubFolders();
      unsubFiles();
    };
  }, [activeWorkspace]);

  if (!activeWorkspace) {
    return (
      <div className="p-12 text-center text-slate-500 text-sm">
        No active workspace selected.
      </div>
    );
  }

  // Filter current directory contents
  const currentFolders = folders.filter(f => f.parentFolderId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const currentFiles = files.filter(f => f.folderId === currentFolderId && f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Folder Breadcrumb
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Root Repository' }];
    let currId = currentFolderId;
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const f = folders.find(item => item.id === currId);
      if (f) {
        crumbs.splice(1, 0, { id: f.id, name: f.name });
        currId = f.parentFolderId;
      } else {
        break;
      }
    }
    return crumbs;
  };

  // Upload handler with simulated progress step intervals
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    if (!canUpload || !activeWorkspace || !currentUser) return;

    const filesArray = Array.from(fileList);
    if (filesArray.length === 0) return;

    for (const rawFile of filesArray) {
      const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);
      const totalSize = rawFile.size;

      // Add to progress tracking
      const newItem: UploadProgressItem = {
        id: uploadId,
        fileName: rawFile.name,
        fileSize: totalSize,
        uploadedSize: 0,
        percentage: 0,
        speed: '3.8 MB/s',
        remainingTime: 'Calculating...',
        status: 'uploading'
      };

      setActiveUploads(prev => [newItem, ...prev]);

      // Read file into Data URL
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setActiveUploads(prev =>
            prev.map(u => u.id === uploadId ? { ...u, uploadedSize: e.loaded, percentage: pct, remainingTime: `${Math.ceil((e.total - e.loaded) / (1024 * 1024))}s` } : u)
          );
        }
      };

      reader.onload = async () => {
        const fileDataUrl = reader.result as string;

        // Save metadata & data to Firestore
        await addWorkspaceFile(
          activeWorkspace.id,
          currentFolderId,
          rawFile.name,
          rawFile.size,
          rawFile.type || 'application/octet-stream',
          fileDataUrl,
          currentUser.id,
          currentUser.name,
          currentUser.role
        );

        setActiveUploads(prev =>
          prev.map(u => u.id === uploadId ? { ...u, percentage: 100, uploadedSize: totalSize, status: 'completed' } : u)
        );

        setTimeout(() => {
          setActiveUploads(prev => prev.filter(u => u.id !== uploadId));
        }, 4000);
      };

      reader.readAsDataURL(rawFile);
    }
  };

  // Download File handler with progress simulation
  const handleDownloadFile = (f: WorkspaceFile) => {
    const downloadId = 'dl_' + Math.random().toString(36).substring(2, 9);
    const item: DownloadProgressItem = {
      id: downloadId,
      fileName: f.name,
      fileSize: f.size,
      downloadedSize: 0,
      percentage: 0,
      status: 'downloading'
    };

    setActiveDownloads(prev => [item, ...prev]);

    let loaded = 0;
    const interval = setInterval(() => {
      loaded += Math.ceil(f.size / 10);
      if (loaded >= f.size) {
        loaded = f.size;
        clearInterval(interval);

        // Trigger real browser download
        const a = document.createElement('a');
        a.href = f.fileData || '#';
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setActiveDownloads(prev =>
          prev.map(d => d.id === downloadId ? { ...d, downloadedSize: f.size, percentage: 100, status: 'completed' } : d)
        );

        setTimeout(() => {
          setActiveDownloads(prev => prev.filter(d => d.id !== downloadId));
        }, 3000);
      } else {
        const pct = Math.round((loaded / f.size) * 100);
        setActiveDownloads(prev =>
          prev.map(d => d.id === downloadId ? { ...d, downloadedSize: loaded, percentage: pct } : d)
        );
      }
    }, 150);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !activeWorkspace || !currentUser) return;

    await createFolder(activeWorkspace.id, newFolderName.trim(), currentFolderId, currentUser.name, currentUser.role);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  const handleDeleteFile = async (f: WorkspaceFile) => {
    if (confirm(`Delete file "${f.name}"?`)) {
      await deleteWorkspaceFile(f.id, activeWorkspace.id, f.name, currentUser?.name || 'Admin', currentUser?.role || 'admin');
    }
  };

  const handleDeleteFolder = async (f: FolderType) => {
    if (confirm(`Delete folder "${f.name}" and all contents?`)) {
      await deleteFolder(f.id, activeWorkspace.id, f.name, currentUser?.name || 'Admin', currentUser?.role || 'admin');
    }
  };

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (mimeType.startsWith('video/')) return <Film className="w-5 h-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-500" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (name.endsWith('.zip') || name.endsWith('.rar')) return <FileCode className="w-5 h-5 text-amber-500" />;
    return <File className="w-5 h-5 text-slate-500" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Active Progress Overlay Banners for Upload & Download */}
      {(activeUploads.length > 0 || activeDownloads.length > 0) && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Background File Activity</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
            {activeUploads.map(up => (
              <div key={up.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="truncate max-w-[180px]">{up.fileName}</span>
                  <span className="text-indigo-400 font-mono">{up.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${up.percentage}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatBytes(up.uploadedSize)} / {formatBytes(up.fileSize)}</span>
                  <span>{up.status === 'completed' ? '✅ Uploaded' : `${up.speed}`}</span>
                </div>
              </div>
            ))}

            {activeDownloads.map(dl => (
              <div key={dl.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="truncate max-w-[180px]">Downloading: {dl.fileName}</span>
                  <span className="text-emerald-400 font-mono">{dl.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${dl.percentage}%` }}></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{formatBytes(dl.downloadedSize)} / {formatBytes(dl.fileSize)}</span>
                  <span>{dl.status === 'completed' ? '✅ Downloaded' : 'Downloading...'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search folders and files..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Upload Controls (Admin & Team ONLY - hidden for clients!) */}
        <div className="flex items-center gap-2">
          {canUpload && (
            <>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Files</span>
              </button>

              <button
                onClick={() => setIsCreateFolderOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-slate-600" />
                <span>New Folder</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 px-1 overflow-x-auto">
        {getBreadcrumbs().map((crumb, idx, arr) => (
          <React.Fragment key={crumb.id || 'root'}>
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={`hover:text-indigo-600 transition-colors ${idx === arr.length - 1 ? 'font-bold text-slate-900' : ''}`}
            >
              {crumb.name}
            </button>
            {idx < arr.length - 1 && <span className="text-slate-300">/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Folders & Files Container */}
      <div className="space-y-6">
        {/* Folders Section */}
        {currentFolders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentFolders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setCurrentFolderId(f.id)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <Folder className="w-6 h-6 text-indigo-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">{f.name}</span>
                  </div>

                  {canModify && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Files</h3>

          {currentFiles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <File className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-700">No files in this folder</h4>
              <p className="text-xs text-slate-400 mt-1">
                {canUpload ? 'Upload files to share with client.' : 'Files uploaded by your team will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentFiles.map((file) => (
                <div key={file.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        {getFileIcon(file.mimeType, file.name)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 truncate max-w-[160px]">{file.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(file.size)} • {file.uploadedByName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Download File"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {canModify && (
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete File"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Create New Folder</h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder Name"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW FILE MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs tracking-tight truncate max-w-md">{previewFile.name}</h3>
              <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex items-center justify-center bg-slate-100 min-h-[300px]">
              {previewFile.mimeType.startsWith('image/') && previewFile.fileData ? (
                <img src={previewFile.fileData} alt={previewFile.name} className="max-h-[60vh] object-contain rounded-xl shadow-lg" />
              ) : previewFile.mimeType.startsWith('video/') && previewFile.fileData ? (
                <video src={previewFile.fileData} controls className="max-h-[60vh] rounded-xl shadow-lg w-full" />
              ) : previewFile.mimeType.startsWith('audio/') && previewFile.fileData ? (
                <audio src={previewFile.fileData} controls className="w-full" />
              ) : previewFile.mimeType.includes('pdf') && previewFile.fileData ? (
                <iframe src={previewFile.fileData} title="PDF Preview" className="w-full h-[60vh] rounded-xl border border-slate-300" />
              ) : (
                <div className="text-center space-y-3">
                  <File className="w-16 h-16 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">Preview unavailable for this format</p>
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-500 inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">{formatBytes(previewFile.size)}</span>
              <button
                onClick={() => handleDownloadFile(previewFile)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
