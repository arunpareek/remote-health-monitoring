/* CREATE TABLESPACE rxr_pharma_perm_01
  DATAFILE 
    SIZE 200M
    AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

CREATE TEMPORARY TABLESPACE rxr_pharma_temp_01
  TEMPFILE 
    SIZE 5M
    AUTOEXTEND ON; */
    
 /*
 solution to the ORA-06596 is to set a hidden parameter "_oracle_script".  
 When you set the undocumented (hidden) parameter "_oracle_script"=true  
 you can create the fred user without a C## in from of the user ID.  
 http://www.dba-oracle.com/t_ora_65096_create_user_12c_without_c_prefix.htm
 */
--alter session set "_ORACLE_SCRIPT"=true;

CREATE USER C##RXR_PHARMA IDENTIFIED BY Welcome1
--  DEFAULT TABLESPACE rxr_pharma_perm_01
--  TEMPORARY TABLESPACE rxr_pharma_temp_01
--  QUOTA 200M on rxr_pharma_perm_01
  ;
  
ALTER USER C##RXR_PHARMA quota unlimited on USERS;
  
  
GRANT create session TO C##RXR_PHARMA;
GRANT create table TO C##RXR_PHARMA;
GRANT create view TO C##RXR_PHARMA;
GRANT create any trigger TO C##RXR_PHARMA;
GRANT create any procedure TO C##RXR_PHARMA;
GRANT create sequence TO C##RXR_PHARMA;
GRANT create synonym TO C##RXR_PHARMA;