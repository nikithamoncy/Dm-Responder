
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Total Messages
        const { count: totalMessages, error: countError } = await supabase
            .from('conversation_history')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // 2. Total Users & Active Users List
        const { data: activeUsers, error: usersError } = await supabase
            .from('conversation_states')
            .select('user_id, username, user_name, profile_pic')
            .order('last_message_at', { ascending: false });

        if (usersError) throw usersError;

        const uniqueUsers = activeUsers?.length || 0;

        // 3. Messages Last 24h
        const { count: last24hMessages, error: last24hError } = await supabase
            .from('conversation_history')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', twentyFourHoursAgo);

        if (last24hError) throw last24hError;

        // 4. Activity Time Series (Last 7 Days)
        // We fetch created_at for the last 7 days and aggregate in JS.
        const { data: timeSeriesData, error: timeSeriesError } = await supabase
            .from('conversation_history')
            .select('created_at')
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: true });

        if (timeSeriesError) throw timeSeriesError;

        // Aggregate by date (YYYY-MM-DD)
        const dailyCounts: Record<string, number> = {};

        // Initialize last 7 days with 0
        for (let i = 0; i < 7; i++) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateString = date.toISOString().split('T')[0];
            dailyCounts[dateString] = 0;
        }

        timeSeriesData.forEach((row: any) => {
            const dateString = new Date(row.created_at).toISOString().split('T')[0];
            if (dailyCounts[dateString] !== undefined) {
                dailyCounts[dateString]++;
            }
        });

        // Convert to array for Recharts
        const activityTimeSeries = Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            totalMessages: totalMessages || 0,
            totalUsers: uniqueUsers || 0,
            activeUsers: activeUsers || [],
            messagesLast24h: last24hMessages || 0,
            activityTimeSeries
        });

    } catch (error: any) {
        console.error('Analytics Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
