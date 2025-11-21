import { useState } from "react";
import { AVAILABLE_INTERESTS } from "./onboarding/steps/StepInterests";

export interface FeedFilters {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    city?: string;
    interests?: string[];
    orientation?: string;
}

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFilters: FeedFilters;
    onApply: (filters: FeedFilters) => void;
}

export function FilterModal({ isOpen, onClose, initialFilters, onApply }: FilterModalProps) {
    const [filters, setFilters] = useState<FeedFilters>(initialFilters);

    if (!isOpen) return null;

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const toggleInterest = (interest: string) => {
        const current = filters.interests || [];
        if (current.includes(interest)) {
            setFilters({ ...filters, interests: current.filter(i => i !== interest) });
        } else {
            setFilters({ ...filters, interests: [...current, interest] });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl neo-border p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Filter Feed</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Age Range */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Age Range</label>
                        <div className="flex gap-4 items-center">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minAge || ""}
                                onChange={(e) => setFilters({ ...filters, minAge: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxAge || ""}
                                onChange={(e) => setFilters({ ...filters, maxAge: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    {/* Gender */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Gender</label>
                        <select
                            value={filters.gender || ""}
                            onChange={(e) => setFilters({ ...filters, gender: e.target.value || undefined })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            <option value="">All Genders</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Orientation</label>
                        <select
                            value={filters.orientation || ""}
                            onChange={(e) => setFilters({ ...filters, orientation: e.target.value || undefined })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                        >
                            <option value="">All Orientations</option>
                            <option value="Straight">Straight</option>
                            <option value="Gay">Gay</option>
                            <option value="Lesbian">Lesbian</option>
                            <option value="Bisexual">Bisexual</option>
                            <option value="Pansexual">Pansexual</option>
                            <option value="Asexual">Asexual</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Interests */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Interests</label>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_INTERESTS.map((interest) => (
                                <button
                                    key={interest}
                                    onClick={() => toggleInterest(interest)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${filters.interests?.includes(interest)
                                            ? "bg-secondary text-foreground border-black shadow-sm"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">City</label>
                        <input
                            type="text"
                            placeholder="Enter city name"
                            value={filters.city || ""}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => {
                                setFilters({});
                                onApply({});
                                onClose();
                            }}
                            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleApply}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:brightness-110 transition-all"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
