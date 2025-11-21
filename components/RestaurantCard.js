/**
 * Traveling Tastebuds - Reusable Restaurant Card Component
 * This component is used consistently across all pages
 */

/**
 * Creates a restaurant card React component
 * @param {Object} props - Component props
 * @param {Object} props.restaurant - Restaurant data object
 * @param {boolean} props.isActive - Whether card should be highlighted
 * @param {Function} props.onOpenModal - Callback when card is clicked
 * @returns {React.Element} Restaurant card component
 */
const RestaurantCard = ({ restaurant, isActive = false, onOpenModal }) => {
    const { useEffect } = React;

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, []);

    return (
        <div
            id={`card-${restaurant.id}`}
            onClick={() => onOpenModal && onOpenModal(restaurant)}
            className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 overflow-hidden flex flex-col h-full group cursor-pointer ${isActive ? 'card-highlight' : ''}`}
        >
            {/* Card Header with Logo */}
            <div className="h-40 relative bg-brand-light/50 flex items-center justify-center p-6 group-hover:bg-brand-light transition duration-500">
                <div className="w-20 h-20 rounded-full bg-white shadow-md overflow-hidden border-4 border-white group-hover:scale-110 transition duration-500 relative z-10 flex items-center justify-center p-2">
                    <img
                        src={restaurant.logo}
                        className="w-full h-full object-contain"
                        alt={restaurant.name}
                        onError={(e) => {
                            e.target.src = '/Images/ttbLogo.png'; // Fallback to main logo
                        }}
                    />
                </div>

                {/* Background blur effect */}
                <div className="absolute inset-0 opacity-10">
                    <img
                        src={restaurant.logo}
                        className="w-full h-full object-cover blur-md scale-150"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>

                {/* Type Badge */}
                <div className="absolute top-3 right-3 bg-brand-sky text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm z-20">
                    {restaurant.type}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6 flex flex-col flex-grow text-center">
                {/* Restaurant Name */}
                <h3 className="font-bold text-xl text-brand-blue leading-tight mb-1">
                    {restaurant.name}
                </h3>

                {/* Location */}
                <p className="text-gray-400 text-xs flex items-center justify-center gap-1 mb-3">
                    <i data-lucide="map-pin" className="w-3 h-3"></i>
                    {restaurant.city}
                </p>

                {/* Discount Badge */}
                {restaurant.discount && (
                    <div className="inline-block mx-auto bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-lg border border-green-100 mb-4">
                        {restaurant.discount}
                    </div>
                )}

                {/* Description */}
                <p className="text-gray-500 text-sm mb-4 leading-relaxed line-clamp-2 text-left">
                    {restaurant.desc}
                </p>

                {/* Watch Review Button */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                    <button className="w-full text-brand-blue py-2 rounded-lg font-bold text-sm hover:text-brand-sky transition flex items-center justify-center gap-2 group-hover:gap-3">
                        Watch Review <i data-lucide="arrow-right" className="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Creates a video modal for displaying TikTok videos
 * @param {Object} props - Component props
 * @param {Object} props.restaurant - Restaurant data object
 * @param {Function} props.onClose - Callback when modal is closed
 * @returns {React.Element} Video modal component
 */
const VideoModal = ({ restaurant, onClose }) => {
    const { useEffect } = React;

    useEffect(() => {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }, []);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-red-500 transition"
                >
                    <i data-lucide="x" className="w-6 h-6"></i>
                </button>

                {restaurant.tiktokId ? (
                    <iframe
                        src={`https://www.tiktok.com/embed/${restaurant.tiktokId}`}
                        width="100%"
                        height="600px"
                        frameBorder="0"
                        allowFullScreen
                        className="w-full"
                    ></iframe>
                ) : (
                    <div className="p-12 text-center text-white">
                        <i data-lucide="video-off" className="w-16 h-16 mx-auto mb-4 opacity-50"></i>
                        <p className="text-xl mb-4">Video coming soon!</p>
                        <p className="text-gray-400">Check back later for our review of {restaurant.name}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Export components for use in other files
if (typeof window !== 'undefined') {
    window.RestaurantCard = RestaurantCard;
    window.VideoModal = VideoModal;
}
