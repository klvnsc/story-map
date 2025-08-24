import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Check for common issues
    const urlIssues = [];
    const keyIssues = [];

    if (!supabaseUrl) {
      urlIssues.push('Missing NEXT_PUBLIC_SUPABASE_URL');
    } else {
      if (!supabaseUrl.startsWith('https://')) urlIssues.push('URL does not start with https://');
      if (supabaseUrl.includes(' ')) urlIssues.push('URL contains spaces');
      if (supabaseUrl.includes('\n')) urlIssues.push('URL contains newlines');
      if (supabaseUrl.includes('\t')) urlIssues.push('URL contains tabs');
      if (supabaseUrl !== supabaseUrl.trim()) urlIssues.push('URL has leading/trailing whitespace');
    }

    if (!supabaseKey) {
      keyIssues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } else {
      if (supabaseKey.includes(' ')) keyIssues.push('Key contains spaces');
      if (supabaseKey.includes('\n')) keyIssues.push('Key contains newlines');
      if (supabaseKey.includes('\t')) keyIssues.push('Key contains tabs');
      if (supabaseKey !== supabaseKey.trim()) keyIssues.push('Key has leading/trailing whitespace');
      if (supabaseKey.length < 50) keyIssues.push('Key appears too short');
    }

    return NextResponse.json({
      success: true,
      environment: {
        urlPresent: !!supabaseUrl,
        urlLength: supabaseUrl?.length || 0,
        urlPrefix: supabaseUrl?.substring(0, 30) || '',
        keyPresent: !!supabaseKey,
        keyLength: supabaseKey?.length || 0,
        keyPrefix: supabaseKey?.substring(0, 10) || ''
      },
      issues: {
        url: urlIssues,
        key: keyIssues
      },
      rawValues: {
        url: JSON.stringify(supabaseUrl),
        key: JSON.stringify(supabaseKey?.substring(0, 20))
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Environment check failed',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}