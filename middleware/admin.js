// Check if user is an admin
export const isAdmin = (req, res, next) => {
    // First check if user exists (should be set by auth middleware)
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authorized to access this route'
        });
    }

    // Check if user is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin role required for this operation'
        });
    }

    next();
}; 