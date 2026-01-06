-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- User Type Enum for Accounts
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- 1. Fiscal Years Table
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tax Categories Table
CREATE TABLE tax_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    rate NUMERIC(5, 4) NOT NULL, -- e.g., 0.1000 for 10%
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type account_type NOT NULL,
    default_tax_category_id UUID REFERENCES tax_categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Sub Accounts Table
CREATE TABLE sub_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Vendors Table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    invoice_number TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_date DATE NOT NULL,
    
    -- Debit
    debit_account_id UUID NOT NULL REFERENCES accounts(id),
    debit_sub_account_id UUID REFERENCES sub_accounts(id),
    debit_amount NUMERIC(15, 2) NOT NULL,
    debit_tax_category_id UUID REFERENCES tax_categories(id),
    
    -- Credit
    credit_account_id UUID NOT NULL REFERENCES accounts(id),
    credit_sub_account_id UUID REFERENCES sub_accounts(id),
    credit_amount NUMERIC(15, 2) NOT NULL,
    credit_tax_category_id UUID REFERENCES tax_categories(id),
    
    vendor_id UUID REFERENCES vendors(id),
    description TEXT,
    receipt_url TEXT,
    fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_fiscal_years_user_id ON fiscal_years(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

-- Updated_at Triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON fiscal_years
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON tax_categories
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON sub_accounts
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- Row Level Security (RLS)
ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Helper function to create RLS policies easily
-- Note: 'auth.uid()' is specific to Supabase/PostgREST
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('fiscal_years', 'tax_categories', 'accounts', 'sub_accounts', 'vendors', 'transactions')
    LOOP
        -- SELECT Policy
        EXECUTE format('CREATE POLICY "Users can view their own %I" ON %I FOR SELECT USING (auth.uid() = user_id)', t, t);
        -- INSERT Policy
        EXECUTE format('CREATE POLICY "Users can insert their own %I" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
        -- UPDATE Policy
        EXECUTE format('CREATE POLICY "Users can update their own %I" ON %I FOR UPDATE USING (auth.uid() = user_id)', t, t);
        -- DELETE Policy
        EXECUTE format('CREATE POLICY "Users can delete their own %I" ON %I FOR DELETE USING (auth.uid() = user_id)', t, t);
    END LOOP;
END $$;
