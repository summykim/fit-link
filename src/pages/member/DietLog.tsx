import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../api/supabase';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

interface DietLog {
  id: number;
  image_url: string;
  memo?: string;
  logged_at: string;
  trainer_feedback?: string;
  feedback_emoji?: string;
}

export default function DietLog() {
  const [dietLogs, setDietLogs] = useState<DietLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 식단 기록 불러오기
  const fetchDietLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('diet_logs')
        .select('*')
        .eq('member_id', user.id)
        .order('logged_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDietLogs((data || []) as DietLog[]);
    } catch (error) {
      console.error('식단 기록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDietLogs();
  }, []);

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('이미지 크기는 5MB 이하여야 합니다.');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 이미지 업로드 및 기록 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      alert('사진을 선택해주세요.');
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 이미지 업로드
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('diet-images')
        .upload(fileName, selectedImage);

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('diet-images')
        .getPublicUrl(fileName);

      // 식단 기록 저장
      const { error: insertError } = await supabase
        .from('diet_logs')
        .insert([
          {
            member_id: user.id,
            image_url: publicUrl,
            memo: memo.trim() || null,
            logged_at: new Date().toISOString().split('T')[0],
          },
        ]);

      if (insertError) throw insertError;

      setIsModalOpen(false);
      setSelectedImage(null);
      setImagePreview(null);
      setMemo('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchDietLogs();
      alert('식단이 성공적으로 업로드되었습니다.');
    } catch (error) {
      console.error('식단 업로드 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      alert(`식단 업로드에 실패했습니다: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">식단 기록</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Camera size={18} />
          식단 업로드
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : dietLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">식단 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dietLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {new Date(log.logged_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  {log.memo && (
                    <p className="text-sm text-gray-600 mt-1">{log.memo}</p>
                  )}
                </div>
                {log.feedback_emoji && (
                  <span className="text-2xl">{log.feedback_emoji}</span>
                )}
              </div>

              {log.image_url && (
                <div className="mb-3">
                  <img
                    src={log.image_url}
                    alt="식단 사진"
                    className="w-full max-w-md rounded-lg border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=이미지+없음';
                    }}
                  />
                </div>
              )}

              {log.trainer_feedback && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">트레이너 피드백:</span> {log.trainer_feedback}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 식단 업로드 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">식단 업로드</h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedImage(null);
                  setImagePreview(null);
                  setMemo('');
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
                aria-label="닫기"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사진 <span className="text-red-500">*</span>
                </label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="미리보기"
                      className="w-full rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                      aria-label="이미지 삭제"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
                  >
                    <Camera size={48} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">사진을 선택하거나 클릭하여 업로드</p>
                    <label htmlFor="diet-image-upload" className="sr-only">
                      식단 사진 업로드
                    </label>
                    <input
                      id="diet-image-upload"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="식단에 대한 메모를 입력하세요"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedImage(null);
                    setImagePreview(null);
                    setMemo('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedImage}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      업로드
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
