import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test 1: Basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('story_collections')
      .select('count', { count: 'exact', head: true })

    if (connectionError) {
      return NextResponse.json({
        success: false,
        error: 'Connection failed',
        details: connectionError.message,
        code: connectionError.code
      })
    }

    // Test 2: Sample query
    const { data: sampleData, error: sampleError } = await supabase
      .from('story_collections')
      .select('id, name, collection_start_date')
      .limit(3)

    if (sampleError) {
      return NextResponse.json({
        success: false,
        error: 'Sample query failed',
        details: sampleError.message,
        code: sampleError.code
      })
    }

    // Test 3: Environment variables
    const envCheck = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      urlStartsWith: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
    }

    return NextResponse.json({
      success: true,
      connectionTest: {
        totalCollections: connectionTest?.length || 0
      },
      sampleData: sampleData || [],
      environment: envCheck,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    })
  }
}