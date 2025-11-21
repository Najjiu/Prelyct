import { NextRequest, NextResponse } from 'next/server'
import { generateReport, ReportConfig } from '@/lib/reportBuilder'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { user } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const config: ReportConfig = body.config

    if (!config || !config.name || !config.reportType) {
      return NextResponse.json(
        { error: 'Invalid report configuration' },
        { status: 400 }
      )
    }

    // Generate report
    const result = await generateReport(config)

    // Save report generation record
    const { data: reportRecord } = await supabase
      .from('custom_reports')
      .insert({
        user_id: user.id,
        election_id: config.electionId || null,
        name: config.name,
        description: config.description,
        report_type: config.reportType,
        filters: config.filters,
        columns: config.columns,
        format: config.format,
      })
      .select()
      .single()

    if (result.fileBuffer) {
      // Convert buffer to base64 for response
      const base64 = result.fileBuffer.toString('base64')
      const mimeType = getMimeType(config.format)

      return NextResponse.json({
        success: true,
        reportId: reportRecord?.id,
        data: result.data,
        file: {
          base64,
          mimeType,
          filename: `${config.name.replace(/\s+/g, '_')}.${config.format}`,
        },
        fileUrl: result.fileUrl,
      })
    }

    return NextResponse.json({
      success: true,
      reportId: reportRecord?.id,
      data: result.data,
    })
  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function getMimeType(format: string): string {
  switch (format) {
    case 'pdf':
      return 'application/pdf'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'csv':
      return 'text/csv'
    case 'json':
      return 'application/json'
    default:
      return 'application/octet-stream'
  }
}


