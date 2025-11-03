import Review from "../models/Review.js";

export const getReviews = async (req, res) => {
    try {
        const reviews = await Review.findReviews(req.query);
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUserReviews = async (req, res) => {
    try {
        const reviews = await Review.findByUserId(req.params.userId, req.query);
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCourseReviews = async (req, res) => {
    try {
        const reviews = await Review.findByCourseId(req.params.courseId, req.query);
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getReviewStats = async (req, res) => {
    try {
        const stats = await Review.getPlatformRatingStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPlatformStats = getReviewStats; // Alias