/**
 * ResourcesStep - Step 3: Thêm tài liệu học tập (video/PDF/image/audio/YouTube)
 */

import React, { useState } from 'react';
import { 
  Upload, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Link as LinkIcon,
  Trash2,
  Edit2,
  Plus,
  X
} from 'lucide-react';
import { LearningResource, ResourceType } from '../../../types/learning';
import { uploadImage } from '../../../../../services/imageUploadService';
import { storage } from '../../../../../lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

interface ResourcesStepProps {
  resources: LearningResource[];
  onResourcesChange: (resources: LearningResource[]) => void;
}

const ResourcesStep: React.FC<ResourcesStepProps> = ({ resources, onResourcesChange }) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<LearningResource>>({
    type: 'video',
    title: '',
    description: '',
    url: '',
    required: false,
    threshold: {},
    learningOutcomes: [],
    order: resources.length
  });

  const handleAddResource = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData({
      type: 'video',
      title: '',
      description: '',
      url: '',
      required: false,
      threshold: {},
      learningOutcomes: [],
      order: resources.length
    });
  };

  const handleEditResource = (resource: LearningResource) => {
    setShowForm(true);
    setEditingId(resource.id);
    setFormData(resource);
  };

  const handleDeleteResource = (id: string) => {
    if (confirm(t('resources.confirmDelete'))) {
      onResourcesChange(resources.filter(r => r.id !== id));
      toast.success(t('resources.success.deleted'));
    }
  };

  const handleFileUpload = async (file: File, type: ResourceType) => {
    setUploading(true);
    try {
      // Validate file size based on type
      const maxSizes = {
        video: 50 * 1024 * 1024, // 50MB
        pdf: 10 * 1024 * 1024,   // 10MB
        audio: 10 * 1024 * 1024, // 10MB
        image: 5 * 1024 * 1024,  // 5MB
        link: 0,
        slides: 5 * 1024 * 1024
      };

      if (file.size > maxSizes[type]) {
        const sizeMB = (maxSizes[type] / (1024 * 1024)).toFixed(0);
        toast.error(t('resources.errors.fileTooLarge', { size: sizeMB, type }));
        setUploading(false);
        return;
      }

      // Validate file type strictly
      const validTypes: Record<ResourceType, string[]> = {
        video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'],
        pdf: ['application/pdf'],
        audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'],
        image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        link: [],
        slides: ['image/jpeg', 'image/png', 'image/webp']
      };

      if (validTypes[type] && !validTypes[type].includes(file.type) && type !== 'link') {
        toast.error(t('resources.errors.invalidFormat', { type }));
        setUploading(false);
        return;
      }

      // Use uploadImage for images, otherwise use direct Firebase upload
      if (type === 'image') {
        const result = await uploadImage(file, {
          folder: 'temp' as any,
          maxSizeKB: 5120,
          generateThumbnails: true
        });

        if (result.success) {
          setFormData(prev => ({
            ...prev,
            url: result.originalUrl,
            thumbnailUrl: result.thumbnailUrls?.medium
          }));
          toast.success(t('resources.success.imageUploaded'));
        } else {
          toast.error(result.error || t('resources.errors.uploadFailed'));
        }
      } else {
        // For video, pdf, audio - upload to Firebase Storage directly
        console.log('📤 Starting upload for:', type, file.name);
        
        // Tạo quizId tạm thời nếu chưa có (dùng timestamp)
        const tempQuizId = 'draft_' + Date.now();
        
        // Cấu trúc thư mục rõ ràng theo chức năng
        const folder = type === 'video' ? `learning-resources/videos/${tempQuizId}` : 
                      type === 'pdf' ? `learning-resources/pdfs/${tempQuizId}` : 
                      type === 'audio' ? `learning-resources/audios/${tempQuizId}` :
                      `learning-resources/images/${tempQuizId}`;
        
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const fullPath = `${folder}/${fileName}`;
        
        console.log('� Upload path:', fullPath);
        console.log('📦 File info:', {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        });
        
        const storageRef = ref(storage, fullPath);
        
        // Upload file with metadata
        const metadata = {
          contentType: file.type,
          customMetadata: {
            uploadedBy: 'user',
            originalName: file.name,
            uploadedAt: new Date().toISOString()
          }
        };
        
        console.log('⬆️ Uploading to Firebase Storage...');
        
        await uploadBytes(storageRef, file, metadata);
        
        console.log('✅ Upload complete, getting download URL...');
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        console.log('🔗 Download URL:', downloadURL);
        
        setFormData(prev => ({
          ...prev,
          url: downloadURL
        }));
        
        const successKey = type === 'video' ? 'resources.success.videoUploaded' :
                          type === 'pdf' ? 'resources.success.pdfUploaded' :
                          'resources.success.audioUploaded';
        toast.success(t(successKey));
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(t('resources.errors.uploadError', { error: error.message }));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveResource = () => {
    // Validation
    if (!formData.title?.trim()) {
      toast.error(t('resources.errors.titleRequired'));
      return;
    }
    if (!formData.url?.trim()) {
      toast.error(t('resources.errors.urlRequired'));
      return;
    }

    const newResource: LearningResource = {
      id: editingId || `res_${Date.now()}`,
      type: formData.type!,
      title: formData.title!,
      description: formData.description || '',
      url: formData.url!,
      required: formData.required || false,
      threshold: formData.threshold || {},
      learningOutcomes: formData.learningOutcomes || [],
      order: formData.order || resources.length,
      thumbnailUrl: formData.thumbnailUrl,
      whyWatch: formData.whyWatch,
      estimatedTime: formData.estimatedTime,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (editingId) {
      // Update existing
      onResourcesChange(resources.map(r => r.id === editingId ? newResource : r));
      toast.success(t('resources.success.updated'));
    } else {
      // Add new
      onResourcesChange([...resources, newResource]);
      toast.success(t('resources.success.added'));
    }

    setShowForm(false);
    setEditingId(null);
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'image': return <ImageIcon className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      default: return <Music className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: ResourceType) => {
    const labels: Record<ResourceType, string> = {
      video: t('resources.types.video'),
      pdf: t('resources.types.pdf'),
      image: t('resources.types.image'),
      audio: t('resources.types.audio'),
      link: t('resources.types.link'),
      slides: t('resources.types.slides')
    };
    return labels[type];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            📚 {t('resources.title')} <span className="text-red-500">*</span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('resources.subtitle')}
          </p>
        </div>
        <button
          onClick={handleAddResource}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('resources.addResource')}
        </button>
      </div>

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="text-center py-12 bg-red-50 rounded-lg border-2 border-dashed border-red-300">
          <Upload className="w-12 h-12 mx-auto text-red-400 mb-3" />
          <p className="text-red-600 font-semibold mb-2">{t('resources.emptyState.warning')}</p>
          <p className="text-sm text-gray-600 mb-4">
            {t('resources.emptyState.description')}<br/>
            {t('resources.emptyState.cannotContinue')}
          </p>
          <button
            onClick={handleAddResource}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + {t('resources.firstResource')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource, index) => (
            <div
              key={resource.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-lg ${
                  resource.type === 'video' ? 'bg-purple-100 text-purple-600' :
                  resource.type === 'pdf' ? 'bg-red-100 text-red-600' :
                  resource.type === 'image' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {getResourceIcon(resource.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {index + 1}. {resource.title}
                        </h4>
                        {resource.required && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            {t('resources.required')}
                          </span>
                        )}
                        {!resource.required && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            {t('resources.recommended')}
                          </span>
                        )}
                      </div>
                      
                      {resource.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {resource.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {getResourceIcon(resource.type)}
                          {getTypeLabel(resource.type)}
                        </span>
                        {resource.estimatedTime && (
                          <span>⏱️ {resource.estimatedTime} phút</span>
                        )}
                        {resource.whyWatch && (
                          <span className="truncate max-w-xs">
                            💡 {resource.whyWatch}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditResource(resource)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('resources.editButton')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('resources.deleteButton')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? t('resources.editResource') : t('resources.newResource')}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-4">
              {/* Resource Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('resources.form.typeLabel')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['video', 'pdf', 'image', 'audio', 'link'] as ResourceType[]).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type }))}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.type === type
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {getResourceIcon(type)}
                        <span className="text-xs font-medium">
                          {getTypeLabel(type)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('resources.form.titleLabel')}
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder={t('resources.form.titlePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('resources.form.descriptionLabel')}
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('resources.form.descriptionPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* URL or Upload - CHIA LUỒNG RÕ RÀNG */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'link' ? t('resources.form.urlLabel.link') : 
                   formData.type === 'video' ? t('resources.form.urlLabel.video') :
                   formData.type === 'pdf' ? t('resources.form.urlLabel.pdf') :
                   formData.type === 'audio' ? t('resources.form.urlLabel.audio') :
                   t('resources.form.urlLabel.image')}
                </label>
                
                {formData.type === 'link' ? (
                  // LINK - CHỈ NHẬP URL
                  <div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('resources.form.urlPlaceholder.link')}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {t('resources.form.linkHint')}
                    </p>
                  </div>
                ) : formData.type === 'video' ? (
                  // VIDEO - CHỈ CHẤP NHẬN VIDEO FILES
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            if (!file.type.startsWith('video/')) {
                              toast.error(t('resources.errors.videoOnly'));
                              e.target.value = '';
                              return;
                            }
                            handleFileUpload(file, 'video');
                          }
                        }}
                        disabled={uploading}
                        className="w-full text-sm"
                      />
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        {t('resources.form.acceptedFormats.video')}
                      </p>
                    </div>
                    <div className="text-center text-sm text-gray-500">{t('resources.form.orDivider')}</div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('resources.form.urlPlaceholder.video')}
                      disabled={uploading}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : formData.type === 'pdf' ? (
                  // PDF - CHỈ CHẤP NHẬN PDF FILES
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
                              toast.error(t('resources.errors.pdfOnly'));
                              e.target.value = '';
                              return;
                            }
                            handleFileUpload(file, 'pdf');
                          }
                        }}
                        disabled={uploading}
                        className="w-full text-sm"
                      />
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        {t('resources.form.acceptedFormats.pdf')}
                      </p>
                    </div>
                    <div className="text-center text-sm text-gray-500">{t('resources.form.orDivider')}</div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('resources.form.urlPlaceholder.pdf')}
                      disabled={uploading}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : formData.type === 'audio' ? (
                  // AUDIO - CHỈ CHẤP NHẬN AUDIO FILES
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50">
                      <input
                        type="file"
                        accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/m4a"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            if (!file.type.startsWith('audio/')) {
                              toast.error(t('resources.errors.audioOnly'));
                              e.target.value = '';
                              return;
                            }
                            handleFileUpload(file, 'audio');
                          }
                        }}
                        disabled={uploading}
                        className="w-full text-sm"
                      />
                      <p className="text-xs text-green-600 mt-2 font-medium">
                        {t('resources.form.acceptedFormats.audio')}
                      </p>
                    </div>
                    <div className="text-center text-sm text-gray-500">{t('resources.form.orDivider')}</div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('resources.form.urlPlaceholder.audio')}
                      disabled={uploading}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  // IMAGE - CHỈ CHẤP NHẬN IMAGE FILES
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            if (!file.type.startsWith('image/')) {
                              toast.error(t('resources.errors.imageOnly'));
                              e.target.value = '';
                              return;
                            }
                            handleFileUpload(file, 'image');
                          }
                        }}
                        disabled={uploading}
                        className="w-full text-sm"
                      />
                      <p className="text-xs text-purple-600 mt-2 font-medium">
                        {t('resources.form.acceptedFormats.image')}
                      </p>
                    </div>
                    <div className="text-center text-sm text-gray-500">{t('resources.form.orDivider')}</div>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder={t('resources.form.urlPlaceholder.image')}
                      disabled={uploading}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                
                {uploading && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-sm text-blue-600 font-medium">{t('resources.form.uploading')}</span>
                    </div>
                  </div>
                )}
                
                {formData.url && !uploading && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">{t('resources.form.urlReady')}</p>
                    <p className="text-xs text-green-600 truncate">{formData.url}</p>
                  </div>
                )}
              </div>

              {/* Required */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="required"
                  checked={formData.required || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="required" className="flex-1 text-sm text-gray-700">
                  <span className="font-medium">{t('resources.form.requiredLabel')}</span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('resources.form.requiredDescription')}
                  </p>
                </label>
              </div>

              {/* Why Watch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('resources.form.whyWatchLabel')}
                </label>
                <input
                  type="text"
                  value={formData.whyWatch || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, whyWatch: e.target.value }))}
                  placeholder={t('resources.form.whyWatchPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Estimated Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('resources.form.estimatedTimeLabel')}
                </label>
                <input
                  type="number"
                  value={formData.estimatedTime || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: parseInt(e.target.value) || undefined }))}
                  placeholder={t('resources.form.estimatedTimePlaceholder')}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {t('resources.cancelButton')}
              </button>
              <button
                onClick={handleSaveResource}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? t('resources.form.uploading') : editingId ? t('resources.updateButton') : t('resources.saveButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesStep;
