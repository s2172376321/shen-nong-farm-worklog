-- Create notice_reads table
DO $$
BEGIN
    -- Create table if not exists
    IF NOT EXISTS (SELECT FROM information_schema.tables 
                   WHERE table_name = 'notice_reads') THEN
        CREATE TABLE notice_reads (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(notice_id, user_id)
        );

        -- Create indexes
        CREATE INDEX idx_notice_reads_notice ON notice_reads(notice_id);
        CREATE INDEX idx_notice_reads_user ON notice_reads(user_id);
        CREATE INDEX idx_notice_reads_read_at ON notice_reads(read_at);
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in 09_create_notice_reads.sql: %', SQLERRM;
END $$; 