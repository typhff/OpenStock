import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { accessConfig, verifyAccessIdentity } from '@/lib/access-identity';

export async function getSingleUserSession() {
    const config = accessConfig();
    const identity = await verifyAccessIdentity((await headers()).get('cf-access-jwt-assertion'), config);
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db!;
    const now = new Date();
    // Reuse an existing owner profile; never merge another user's settings or watchlist.
    await db.collection('user').updateOne({ email: config.email }, {
        $setOnInsert: {
            email: config.email, name: 'Personal user', emailVerified: true,
            createdAt: now, updatedAt: now, country: 'US',
        },
    }, { upsert: true });
    const owner = await db.collection('user').findOne({ email: config.email });
    if (!owner) throw new Error('Owner profile unavailable');
    const id = owner._id.toString();
    return {
        user: {
            id, email: config.email, emailVerified: true, name: String(owner.name),
            createdAt: owner.createdAt as Date, updatedAt: owner.updatedAt as Date,
            country: owner.country as string | undefined,
            investmentGoals: owner.investmentGoals as string | undefined,
            riskTolerance: owner.riskTolerance as string | undefined,
            preferredIndustry: owner.preferredIndustry as string | undefined,
        },
        session: {
            id: `access:${identity.sub}`, userId: id, token: '',
            createdAt: new Date(identity.iat! * 1000), updatedAt: now,
            expiresAt: new Date(identity.exp! * 1000),
        },
    };
}
