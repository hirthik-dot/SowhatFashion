import mongoose from 'mongoose';
export declare const User: mongoose.Model<{
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {}, mongoose.Document<unknown, {}, {
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {
    timestamps: true;
}> & {
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps>, {}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: true;
}>> & mongoose.FlatRecord<{
    email: string;
    name: string;
    isEmailVerified: boolean;
    savedAddresses: mongoose.Types.DocumentArray<{
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }, mongoose.Types.Subdocument<mongoose.mongo.BSON.ObjectId, any, {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }> & {
        label: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
    }>;
    wishlist: mongoose.Types.ObjectId[];
    avatar?: string | null | undefined;
    googleId?: string | null | undefined;
    lastLoginAt?: NativeDate | null | undefined;
} & mongoose.DefaultTimestampProps> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=User.d.ts.map