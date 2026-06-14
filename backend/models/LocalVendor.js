const vendorSchema = new mongoose.Schema({
    businessName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Local Cab', 'Tour Guide']
    },
    city: {
        type: String,
        required: true
    },
    contactPhone: {
        type: String,
        required: true
    },
    partneredHotels: [{
        hotelName: {
            type: String,
            required: true
        },
        phoneNumber: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            match: [/.+\@.+\..+/, 'Please fill a valid email address'] // Basic email validation
        },
        starRating: {
            type: Number,
            min: [1, 'Rating must be at least 1 star'],
            max: [5, 'Rating cannot exceed 5 stars'],
            default: 3
        }
    }],
    ratings: [{
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip'
        },
        score: {
            type: Number,
            min: 1, max: 5
        },
        review: {
            type: String
        }
    }]
}, {
    timestamps: true
});
export const LocalVendor = mongoose.model('LocalVendor', vendorSchema);